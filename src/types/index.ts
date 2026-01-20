// Database types for Presale Tracker

export type StageStatus = 'not_started' | 'in_progress' | 'completed';
export type NotificationChannel = 'sms' | 'email';
export type NotificationStatus = 'pending_review' | 'approved' | 'sent' | 'failed';
export type MessageDirection = 'inbound' | 'outbound';
export type Carrier = 'fedex' | 'ups' | 'usps' | 'dhl';

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_phone_normalized: string;
  items_description: string;
  quantity: number;
  carrier: Carrier | null;
  tracking_number: string | null;
  is_cancelled: boolean;
  is_delayed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  icon_name: string | null;
}

export interface OrderProgress {
  id: string;
  order_id: string;
  stage_id: number;
  status: StageStatus;
  estimated_start_date: string | null;
  estimated_end_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  admin_notes: string | null;
}

export interface Photo {
  id: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  caption: string | null;
  stage_id: number | null;
  uploaded_at: string;
}

export interface OrderPhoto {
  order_id: string;
  photo_id: string;
}

export interface NotificationPreference {
  order_id: string;
  sms_enabled: boolean;
  email_enabled: boolean;
  opted_in_at: string | null;
}

export interface NotificationQueueItem {
  id: string;
  order_id: string;
  stage_id: number;
  channel: NotificationChannel;
  recipient: string;
  message_body: string;
  status: NotificationStatus;
  batch_id: string | null;
  reviewed_at: string | null;
  sent_at: string | null;
  error_message: string | null;
}

export interface Message {
  id: string;
  order_id: string;
  direction: MessageDirection;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
}

// Extended types with relations
export interface OrderWithProgress extends Order {
  progress: (OrderProgress & { stage: Stage })[];
  photos?: Photo[];
  notification_preferences?: NotificationPreference;
}

export interface OrderProgressWithStage extends OrderProgress {
  stage: Stage;
}

// API Request/Response types
export interface OrderLookupRequest {
  orderNumber: string;
  phone: string;
}

export interface OrderLookupResponse {
  success: boolean;
  order?: OrderWithProgress;
  error?: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  admin?: Omit<AdminUser, 'password_hash'>;
  error?: string;
}

// CSV Import types
export interface OrderCSVRow {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items_description: string;
  quantity?: string;
}

export interface StageUpdateCSVRow {
  order_number: string;
  stage: string;
  status: string;
  estimated_start_date?: string;
  estimated_end_date?: string;
  notes?: string;
}

export interface CSVImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

// Dashboard stats
export interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  delayedOrders: number;
  pendingNotifications: number;
  unreadMessages: number;
  ordersByStage: { stage: string; count: number }[];
}
