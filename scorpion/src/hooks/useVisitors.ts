import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Visitor } from '@/types';
import { toast } from 'sonner';

export function useVisitorByMobile(mobile: string) {
  return useQuery({
    queryKey: ['visitor-by-mobile', mobile],
    queryFn: async () => {
      if (!mobile || mobile.length < 6) return null;
      const { data } = await supabase
        .from('visitors')
        .select('*')
        .eq('mobile_number', mobile)
        .maybeSingle();
      return data as Visitor | null;
    },
    enabled: mobile.length >= 6,
  });
}

export function useCheckIns(filters?: { status?: string; date?: string; officialId?: string }) {
  return useQuery({
    queryKey: ['check-ins', filters],
    queryFn: async () => {
      let query = supabase
        .from('check_ins')
        .select(`
          *,
          visitor:visitors(*),
          official:profiles!check_ins_official_id_fkey(*),
          receptionist:profiles!check_ins_receptionist_id_fkey(*)
        `)
        .order('check_in_time', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.officialId) query = query.eq('official_id', filters.officialId);
      if (filters?.date) {
        // Use IST timezone boundaries to avoid UTC midnight cutting across the IST day
        query = query
          .gte('check_in_time', `${filters.date}T00:00:00+05:30`)
          .lte('check_in_time', `${filters.date}T23:59:59+05:30`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useTodayCheckIns() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return useCheckIns({ date: today });
}

export function useCreateCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      visitor: Omit<Visitor, 'id' | 'created_at' | 'updated_at'>;
      officialId: string | null;
      purpose: string | null;
      receptionistId: string;
    }) => {
      let visitorId: string;

      const { data: existing } = await supabase
        .from('visitors')
        .select('id')
        .eq('mobile_number', data.visitor.mobile_number)
        .maybeSingle();

      if (existing) {
        await supabase.from('visitors').update({
          full_name: data.visitor.full_name,
          visitor_type: data.visitor.visitor_type,
          ...(data.visitor.photo_url && { photo_url: data.visitor.photo_url }),
        }).eq('id', existing.id);
        visitorId = existing.id;
      } else {
        const { data: newVisitor, error } = await supabase
          .from('visitors')
          .insert(data.visitor)
          .select()
          .single();
        if (error) throw error;
        visitorId = newVisitor.id;
      }

      const status = data.visitor.visitor_type === 'courier' ? 'checked_out' : 'checked_in';

      const { data: checkIn, error } = await supabase
        .from('check_ins')
        .insert({
          visitor_id: visitorId,
          official_id: data.officialId,
          receptionist_id: data.receptionistId,
          purpose_of_visit: data.purpose,
          status,
          check_in_time: new Date().toISOString(),
          ...(status === 'checked_out' && { check_out_time: new Date().toISOString() }),
        })
        .select()
        .single();

      if (error) throw error;
      return checkIn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Check-in recorded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to record check-in: ${error.message}`);
    },
  });
}

export function useApproveCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ checkInId, officialId }: { checkInId: string; officialId: string }) => {
      const { error } = await supabase
        .from('check_ins')
        .update({
          status: 'checked_out',
          check_out_time: new Date().toISOString(),
          approved_by: officialId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', checkInId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Check-out approved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to approve check-out: ${error.message}`);
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const todayStart = `${today}T00:00:00+05:30`;

      const [checkedIn, pending, deliveries, visitors] = await Promise.all([
        supabase.from('check_ins').select('id', { count: 'exact' }).eq('status', 'checked_in'),
        supabase.from('check_ins').select('id', { count: 'exact' }).eq('status', 'pending_approval'),
        supabase.from('check_ins').select('id', { count: 'exact' }).gte('check_in_time', todayStart),
        supabase.from('courier_receipts').select('id', { count: 'exact' }).gte('created_at', todayStart),
      ]);

      return {
        currently_checked_in: checkedIn.count ?? 0,
        pending_approvals: pending.count ?? 0,
        today_couriers: visitors.count ?? 0,
        today_total: deliveries.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });
}
