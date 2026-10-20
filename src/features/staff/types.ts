/**
 * Phase 1D — Staff, Shifts, Breaks & Time Off Domain Types
 */

export interface StaffProfile {
  id: string;
  business_id: string;
  user_id: string | null;
  display_name: string;
  professional_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  is_archived: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StaffWithServices extends StaffProfile {
  service_ids: string[];
  assigned_services_count: number;
}

export interface StaffWorkingHourInterval {
  id?: string;
  staff_id?: string;
  business_id?: string;
  day_of_week: number; // 0=Sunday ... 6=Saturday
  is_working: boolean;
  open_time: string | null; // "HH:MM"
  close_time: string | null; // "HH:MM"
}

export interface StaffBreak {
  id: string;
  business_id: string;
  staff_id: string;
  day_of_week: number;
  break_title: string;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  created_at: string;
  updated_at: string;
}

export type StaffTimeOffReason = "vacation" | "sick" | "personal" | "training" | "other";

export interface StaffTimeOff {
  id: string;
  business_id: string;
  staff_id: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string; // "YYYY-MM-DD"
  is_full_day: boolean;
  start_time: string | null; // "HH:MM"
  end_time: string | null; // "HH:MM"
  reason_type: StaffTimeOffReason;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
