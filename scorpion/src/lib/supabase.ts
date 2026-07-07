import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
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
      face_logs: {
        Row: {
          id: string;
          captured_at: string;
          photo_url: string | null;
          face_count: number;
          confidence: number | null;
          camera_label: string | null;
          logged_by: string | null;
          created_at: string;
        };
      };
    };
  };
};
