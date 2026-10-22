/**
 * BookPilot AI — Phase 1F Public Customer Booking Types
 * Strict domain typing for public customer booking wizard, sanitized salon landing data,
 * and secure customer self-service capabilities.
 */

export interface PublicBusinessHours {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  bufferMinutes: number;
  assignedStaffIds: string[];
}

export interface PublicStaff {
  id: string;
  displayName: string;
  displayOrder: number;
}

export interface PublicSalonProfile {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  timezone: string;
  currency: string;
  onlineBookingEnabled: boolean;
  cancellationPolicyText: string | null;
  cancellationNoticeHours: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  openingHours: PublicBusinessHours[];
  services: PublicService[];
  staff: PublicStaff[];
}

export type SlotPeriod = "morning" | "afternoon" | "evening";

export interface PublicSlot {
  startsAt: string; // ISO 8601 UTC
  serviceEndsAt: string; // ISO 8601 UTC
  availableStaffIds: string[];
  localTime: string; // HH:mm in salon timezone
  period: SlotPeriod;
}

export interface PublicAvailabilityData {
  date: string; // YYYY-MM-DD
  timezone: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  bufferMinutes: number;
  staffPreference: "any" | "specific";
  selectedStaffId: string | null;
  slots: PublicSlot[];
  totalSlotsCount: number;
  onlineBookingEnabled: boolean;
}

export interface PublicBookingInput {
  businessSlug: string;
  serviceId: string;
  staffId?: string | null; // null for Any Available
  startsAt: string; // ISO 8601 UTC
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerNotes?: string;
  idempotencyKey?: string;
}

export interface PublicBookingOutcome {
  appointmentId: string;
  bookingReference: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  startsAt: string;
  serviceEndsAt: string;
  priceAmount: number;
  currency: string;
  status: string;
  managementToken?: string;
  managementUrl?: string;
  isIdempotentReplay?: boolean;
}

export interface ManagedAppointmentDetails {
  appointmentId: string;
  bookingReference: string;
  status: "confirmed" | "cancelled" | "pending" | "completed" | "no_show";
  startsAt: string;
  serviceEndsAt: string;
  priceAmount: number;
  currency: string;
  serviceName: string;
  serviceId: string;
  staffName: string;
  staffId: string;
  customerNotes: string | null;
  business: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    addressLine1: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
  };
  policy: {
    cancellationNoticeHours: number;
    cancellationPolicyText: string | null;
    minNoticeHours: number;
    maxAdvanceDays: number;
  };
  permissions: {
    canCancel: boolean;
    canReschedule: boolean;
  };
}

export interface PublicBookingState {
  step: 1 | 2 | 3 | 4 | 5;
  selectedService: PublicService | null;
  selectedStaffId: string | null; // null = Any Available
  selectedDate: string; // YYYY-MM-DD
  selectedSlot: PublicSlot | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
}
