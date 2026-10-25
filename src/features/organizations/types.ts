export type BusinessType = 'salon' | 'barbershop' | 'spa' | 'trainer' | 'other';
export type MemberRole = 'owner' | 'manager' | 'staff';

export interface Business {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Extended Phase 1C profile columns
  description?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_region?: string | null;
  postal_code?: string | null;
  country: string;
  timezone: string;
  currency?: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  updated_at: string;
}

export interface BusinessWithRole extends Business {
  role: MemberRole;
}

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpeningHourInterval {
  id?: string;
  business_id?: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  is_closed: boolean;
  open_time: string | null; // e.g. "09:00" or "09:00:00"
  close_time: string | null; // e.g. "17:00" or "17:00:00"
}

export interface ScheduleException {
  id?: string;
  business_id?: string;
  exception_date: string; // "YYYY-MM-DD"
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  reason?: string | null;
}

export interface BookingPolicy {
  id?: string;
  business_id?: string;
  min_notice_hours: number;
  max_advance_days: number;
  cancellation_notice_hours: number;
  default_buffer_minutes: number;
  online_booking_enabled: boolean;
  cancellation_policy_text?: string | null;
}

export interface OnboardingProgress {
  id?: string;
  business_id: string;
  current_step: number;
  completed_steps: number[];
  is_completed: boolean;
  completed_at?: string | null;
  updated_at?: string;
}

export interface FullBusinessConfig {
  business: BusinessWithRole;
  openingHours: OpeningHourInterval[];
  exceptions: ScheduleException[];
  policy: BookingPolicy;
  onboarding: OnboardingProgress;
  notificationSettings?: {
    id?: string;
    business_id: string;
    notify_on_new_booking: boolean;
    notify_on_reschedule: boolean;
    notify_on_cancellation: boolean;
  };
  aiSettings?: {
    id?: string;
    business_id: string;
    ai_receptionist_enabled: boolean;
    default_language: "en" | "ur" | "ur-Latn";
    welcome_message: string | null;
    faqs: Array<{ question: string; answer: string }>;
  };
  aiMode?: "mock" | "openai" | "disabled";
  aiModel?: string;
}


