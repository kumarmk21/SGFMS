import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { InternalCourierTrackingRecord } from '@/types';

export type InternalCourierTrackingInput = Pick<
  InternalCourierTrackingRecord,
  | 'courier_date'
  | 'consignee'
  | 'consignor'
  | 'courier_name'
  | 'document_tracking_number'
  | 'location'
> & {
  status?: string | null;
  remarks?: string | null;
  extra_fields?: Record<string, unknown>;
};

const queryKey = ['internal-courier-tracking'];

function normalizeInput(input: InternalCourierTrackingInput) {
  return {
    ...input,
    status: input.status?.trim() || null,
    remarks: input.remarks?.trim() || null,
    extra_fields: input.extra_fields ?? {},
  };
}

export function useInternalCourierTracking() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_courier_tracking')
        .select('*')
        .order('courier_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as InternalCourierTrackingRecord[];
    },
    refetchInterval: 15000,
  });
}

export function useCreateInternalCourierTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InternalCourierTrackingInput & { created_by?: string | null }) => {
      const { data, error } = await supabase
        .from('internal_courier_tracking')
        .insert({
          ...normalizeInput(input),
          created_by: input.created_by ?? null,
          updated_by: input.created_by ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InternalCourierTrackingRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Outward courier entry added');
    },
    onError: (error) => {
      toast.error(`Failed to add entry: ${error.message}`);
    },
  });
}

export function useUpdateInternalCourierTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updated_by,
      ...input
    }: InternalCourierTrackingInput & { id: string; updated_by?: string | null }) => {
      const { data, error } = await supabase
        .from('internal_courier_tracking')
        .update({
          ...normalizeInput(input),
          updated_by: updated_by ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InternalCourierTrackingRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Outward courier entry updated');
    },
    onError: (error) => {
      toast.error(`Failed to update entry: ${error.message}`);
    },
  });
}

export function useDeleteInternalCourierTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('internal_courier_tracking')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Outward courier entry deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete entry: ${error.message}`);
    },
  });
}
