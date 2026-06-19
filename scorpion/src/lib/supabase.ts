import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
);

if (!isSupabaseConfigured) {
  console.error('Missing Supabase environment variables. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl || 'http://localhost:54321', supabaseAnonKey || 'missing-supabase-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: 'receptionist' | 'official' | 'admin';
          department: string | null;
          contact_number: string | null;
          email: string | null;
          designation: string | null;
          is_available: boolean;
          avatar_url: string | null;
          fcm_token: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      visitors: {
        Row: {
          id: string;
          mobile_number: string;
          full_name: string;
          visitor_type: 'courier' | 'delivery_agent' | 'visitor';
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      check_ins: {
        Row: {
          id: string;
          visitor_id: string;
          official_id: string | null;
          receptionist_id: string;
          purpose_of_visit: string | null;
          status: 'checked_in' | 'pending_approval' | 'checked_out';
          check_in_time: string;
          check_out_time: string | null;
          approved_by: string | null;
          approved_at: string | null;
          notes: string | null;
          created_at: string;
        };
      };
      courier_receipts: {
        Row: {
          id: string;
          check_in_id: string;
          sender_name: string;
          sender_address: string;
          recipient_id: string;
          tracking_number: string | null;
          package_weight: string | null;
          package_description: string;
          number_of_packages: number;
          created_at: string;
        };
      };
      internal_courier_tracking: {
        Row: {
          id: string;
          courier_date: string;
          consignee: string;
          consignor: string;
          courier_name: string;
          document_tracking_number: string | null;
          location: string;
          status: string | null;
          remarks: string | null;
          extra_fields: Record<string, unknown>;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          sender_id: string | null;
          check_in_id: string | null;
          courier_receipt_id: string | null;
          title: string;
          message: string;
          notification_type: 'sms' | 'push' | 'in_app';
          status: 'pending' | 'sent' | 'failed' | 'read';
          created_at: string;
          read_at: string | null;
        };
      };
    };
  };
};
