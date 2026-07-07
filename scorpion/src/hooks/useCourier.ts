import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CourierReceipt } from '@/types';
import { toast } from 'sonner';

// IST offset = +05:30
const IST_OFFSET = '+05:30';

/** Convert a local YYYY-MM-DD date string to IST-aware UTC boundary timestamps */
function istDayBounds(date: string) {
  return {
    start: `${date}T00:00:00${IST_OFFSET}`,
    end:   `${date}T23:59:59${IST_OFFSET}`,
  };
}

/** Returns today's date in IST as YYYY-MM-DD */
function todayIST(): string {
  return new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // en-CA = YYYY-MM-DD
}

export function useCourierReceipts(date?: string) {
  return useQuery({
    queryKey: ['courier-receipts', date],
    queryFn: async () => {
      let query = supabase
        .from('courier_receipts')
        .select(`
          *,
          recipient:profiles!courier_receipts_recipient_id_fkey(*),
          check_in:check_ins(
            *,
            visitor:visitors(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (date) {
        const { start, end } = istDayBounds(date);
        query = query.gte('created_at', start).lte('created_at', end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CourierReceipt[];
    },
    refetchInterval: 15000,
  });
}

export function useTodayCourierReceipts() {
  return useCourierReceipts(todayIST());
}

export function useCreateCourierReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receipt: Omit<CourierReceipt, 'id' | 'created_at' | 'check_in' | 'recipient'>) => {
      const { data, error } = await supabase
        .from('courier_receipts')
        .insert(receipt)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Courier receipt logged successfully');
    },
    onError: (error) => {
      toast.error(`Failed to log receipt: ${error.message}`);
    },
  });
}
