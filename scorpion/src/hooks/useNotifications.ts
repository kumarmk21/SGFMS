import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';
import { toast } from 'sonner';

export function useNotifications(recipientId?: string) {
  return useQuery({
    queryKey: ['notifications', recipientId],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select(`
          *,
          check_in:check_ins(
            *,
            visitor:visitors(*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (recipientId) query = query.eq('recipient_id', recipientId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!recipientId,
    refetchInterval: 10000,
  });
}

export function useUnreadCount(recipientId?: string) {
  return useQuery({
    queryKey: ['notifications-unread', recipientId],
    queryFn: async () => {
      if (!recipientId) return 0;
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('recipient_id', recipientId)
        .eq('status', 'sent');
      return count ?? 0;
    },
    enabled: !!recipientId,
    refetchInterval: 10000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: (_, notificationId) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipientId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('recipient_id', recipientId)
        .eq('status', 'sent');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      toast.success('All notifications marked as read');
    },
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notification: {
      recipient_id: string;
      sender_id?: string;
      check_in_id?: string;
      courier_receipt_id?: string;
      title: string;
      message: string;
      notification_type: 'sms' | 'push' | 'in_app';
    }) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({ ...notification, status: 'sent' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}
