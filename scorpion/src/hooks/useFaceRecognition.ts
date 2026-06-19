import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { FaceEntryLog, FaceVisitorProfile } from '@/types';

const faceVisitorsKey = ['face-visitor-profiles'];
const faceLogsKey = ['face-entry-logs'];

interface FaceVisitorInput {
  full_name: string;
  phone: string;
  email?: string | null;
  face_descriptor: number[];
  photo_data_url?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

interface FaceEntryInput {
  face_visitor_id: string;
  match_distance: number;
  snapshot_data_url?: string | null;
  created_by?: string | null;
}

export function useFaceVisitors() {
  return useQuery({
    queryKey: faceVisitorsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('face_visitor_profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as FaceVisitorProfile[];
    },
    refetchInterval: 30000,
  });
}

export function useRegisterFaceVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FaceVisitorInput) => {
      const { data, error } = await supabase
        .from('face_visitor_profiles')
        .upsert({
          full_name: input.full_name.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim() || null,
          face_descriptor: input.face_descriptor,
          photo_data_url: input.photo_data_url ?? null,
          is_active: true,
          created_by: input.created_by ?? null,
          updated_by: input.updated_by ?? input.created_by ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'phone' })
        .select()
        .single();

      if (error) throw error;
      return data as FaceVisitorProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faceVisitorsKey });
      toast.success('Face profile registered');
    },
    onError: (error) => {
      toast.error(`Failed to register face profile: ${error.message}`);
    },
  });
}

export function useCreateFaceEntryLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FaceEntryInput) => {
      const { data, error } = await supabase
        .from('face_entry_logs')
        .insert({
          face_visitor_id: input.face_visitor_id,
          match_distance: input.match_distance,
          snapshot_data_url: input.snapshot_data_url ?? null,
          created_by: input.created_by ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FaceEntryLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faceLogsKey });
    },
    onError: (error) => {
      toast.error(`Failed to log face entry: ${error.message}`);
    },
  });
}

export function useFaceEntryLogs() {
  return useQuery({
    queryKey: faceLogsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('face_entry_logs')
        .select('*, visitor:face_visitor_profiles(*)')
        .order('entry_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as FaceEntryLog[];
    },
    refetchInterval: 15000,
  });
}
