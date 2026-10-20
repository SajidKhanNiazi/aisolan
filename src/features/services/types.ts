/**
 * Phase 1D — Services & Pricing Domain Types
 */

export interface ServiceCategory {
  id: string;
  business_id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_amount: number; // Integer minor units (e.g. 2000 = £20.00)
  currency: string; // ISO 4217, default "GBP"
  duration_minutes: number; // Duration in minutes (e.g. 30)
  buffer_minutes: number; // Optional buffer in minutes (e.g. 10)
  is_active: boolean;
  is_archived: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceWithCategory extends Service {
  category?: ServiceCategory | null;
  assigned_staff_count?: number;
}

/**
 * Currency formatting helper using standard Intl.NumberFormat.
 * Converts integer minor units (pence/cents) to human-readable string.
 * Example: formatCurrency(2000, 'GBP') -> '£20.00'
 */
export function formatCurrency(minorUnits: number, currency = "GBP"): string {
  const majorUnits = minorUnits / 100;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(majorUnits);
  } catch {
    return `${currency.toUpperCase()} ${majorUnits.toFixed(2)}`;
  }
}

/**
 * Converts decimal input string (e.g. "20.50" or "20") to integer minor units (2050).
 */
export function parsePriceToMinorUnits(priceInput: string | number): number {
  if (typeof priceInput === "number") {
    return priceInput < 0 ? 0 : Math.round(priceInput * 100);
  }
  if (!priceInput || typeof priceInput !== "string" || priceInput.trim().startsWith("-")) {
    return 0;
  }
  const sanitized = priceInput.replace(/[^0-9.]/g, "");
  const num = parseFloat(sanitized);
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}
