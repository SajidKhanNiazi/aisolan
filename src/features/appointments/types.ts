/**
 * BookPilot AI — Appointments & Booking Domain Types (Phase 1E-A)
 */

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string;
  staff_id: string;
  status: AppointmentStatus;
  starts_at: string; // ISO 8601 UTC timestamptz
  service_ends_at: string;
  occupied_starts_at: string;
  occupied_ends_at: string;
  duration_minutes_snapshot: number;
  buffer_before_minutes_snapshot: number;
  buffer_after_minutes_snapshot: number;
  price_minor_snapshot: number; // e.g. 2500 = £25.00
  currency_snapshot: string; // ISO 4217, e.g. 'GBP'
  service_name_snapshot: string;
  customer_name_snapshot: string;
  timezone_snapshot: string; // IANA zone, e.g. 'Europe/London'
  cancellation_reason: string | null;
  cancelled_at: string | null;
  notes: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithDetails extends Appointment {
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  service?: {
    id: string;
    name: string;
    price_amount: number;
    duration_minutes: number;
  };
  staff?: {
    id: string;
    display_name: string;
    professional_title: string | null;
  };
}

export interface CreateAppointmentInput {
  business_id: string;
  service_id: string;
  staff_id: string;
  starts_at: string; // ISO string
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  notes?: string;
  idempotency_key?: string;
}

export interface RescheduleAppointmentInput {
  business_id: string;
  appointment_id: string;
  new_starts_at: string; // ISO string
  new_staff_id?: string;
  reason?: string;
}

export interface CancelAppointmentInput {
  business_id: string;
  appointment_id: string;
  reason?: string;
}

export interface UpdateAppointmentStatusInput {
  business_id: string;
  appointment_id: string;
  status: AppointmentStatus;
  reason?: string;
}

export interface AppointmentOperationResult<T = Appointment> {
  success: boolean;
  data?: T;
  code?: string;
  error?: string;
  is_idempotent_replay?: boolean;
}

export interface AppointmentKpis {
  todayCount: number;
  confirmedCount: number;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  upcomingCount: number;
  todayRevenueMinor: number;
  currency: string;
}

export interface CustomerWithMetrics extends Customer {
  totalVisits: number;
  cancelledVisits: number;
  lastVisitDate: string | null;
  upcomingVisitDate: string | null;
}

export interface CustomerProfileWithHistory {
  customer: Customer;
  appointments: AppointmentWithDetails[];
  metrics: {
    totalVisits: number;
    completedVisits: number;
    cancelledVisits: number;
    noShowVisits: number;
    totalSpendMinor: number;
  };
}
