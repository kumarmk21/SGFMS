import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import { toast } from 'sonner';

export function useOfficials() {
  return useQuery({
    queryKey: ['officials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'official')
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useAvailableOfficials() {
  return useQuery({
    queryKey: ['officials', 'available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'official')
        .eq('is_available', true)
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: {
      full_name: string;
      role: string;
      department?: string;
      contact_number?: string;
      email: string;
      designation?: string;
      password: string;
    }) => {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: profile.email,
        password: profile.password,
        email_confirm: true,
      });
      if (authError) throw authError;

      const { error } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: profile.full_name,
        role: profile.role,
        department: profile.department,
        contact_number: profile.contact_number,
        email: profile.email,
        designation: profile.designation,
      });
      if (error) throw error;
      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['officials'] });
      toast.success('User created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create user: ${error.message}`);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Profile> & { id: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['officials'] });
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
}

export function useToggleAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['officials'] });
    },
  });
}
