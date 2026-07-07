export type UserRole = 'receptionist' | 'official' | 'admin';
export type VisitorType = 'courier' | 'delivery_agent' | 'visitor';
export type CheckInStatus = 'checked_in' | 'pending_approval' | 'checked_out';
export type NotificationType = 'sms' | 'push' | 'in_app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  contact_number: string | null;
  email: string | null;
  designation: string | null;
  is_available: boolean;
  avatar_url: string | null;
  fcm_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Visitor {
  id: string;
  mobile_number: string;
  full_name: string;
  visitor_type: VisitorType;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  visitor_id: string;
  visitor?: Visitor;
  official_id: string | null;
  official?: Profile;
  receptionist_id: string;
  receptionist?: Profile;
  purpose_of_visit: string | null;
  status: CheckInStatus;
  check_in_time: string;
  check_out_time: string | null;
  approved_by: string | null;
  approved_by_profile?: Profile;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface CourierReceipt {
  id: string;
  check_in_id: string | null;
  check_in?: CheckIn;
  sender_name: string;
  sender_address: string;
  recipient_id: string;
  recipient?: Profile;
  tracking_number: string | null;
  package_weight: string | null;
  package_description: string;
  number_of_packages: number;
  created_at: string;
}

export interface InternalCourierTrackingRecord {
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
}

export interface FaceVisitorProfile {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  face_descriptor: number[];
  photo_data_url: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaceEntryLog {
  id: string;
  face_visitor_id: string;
  visitor?: FaceVisitorProfile;
  entry_at: string;
  match_distance: number | null;
  snapshot_data_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  recipient?: Profile;
  sender_id: string | null;
  check_in_id: string | null;
  check_in?: CheckIn;
  courier_receipt_id: string | null;
  courier_receipt?: CourierReceipt;
  title: string;
  message: string;
  notification_type: NotificationType;
  status: NotificationStatus;
  created_at: string;
  read_at: string | null;
}

export interface DashboardStats {
  currently_checked_in: number;
  pending_approvals: number;
  today_couriers: number;
  today_visitors: number;
  today_deliveries: number;
}
