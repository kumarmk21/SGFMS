import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CourierReceipt } from '@/types';
import { toast } from 'sonner';

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
        query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CourierReceipt[];
    },
    refetchInterval: 15000,
  });
}

export function useTodayCourierReceipts() {
  const today = new Date().toISOString().split('T')[0];
  return useCourierReceipts(today);
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
