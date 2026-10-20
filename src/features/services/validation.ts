import { z } from "zod";

export const serviceCategorySchema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(60, "Category name cannot exceed 60 characters")
    .trim(),
  display_order: z.number().int().min(0).default(0),
});

export type ServiceCategoryInput = z.infer<typeof serviceCategorySchema>;

export const serviceSchema = z.object({
  name: z
    .string()
    .min(2, "Service name must be at least 2 characters")
    .max(100, "Service name cannot exceed 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  category_id: z.string().uuid("Invalid category ID").optional().nullable().or(z.literal("")),
  price_amount: z
    .number()
    .int("Price must be a whole number in minor units (pence/cents)")
    .min(0, "Price cannot be negative")
    .max(1000000, "Price cannot exceed 1,000,000 minor units (£10,000)"),
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter ISO code (e.g. GBP)")
    .toUpperCase()
    .default("GBP"),
  duration_minutes: z
    .number()
    .int("Duration must be an integer number of minutes")
    .min(5, "Duration must be at least 5 minutes")
    .max(720, "Duration cannot exceed 720 minutes (12 hours)"),
  buffer_minutes: z
    .number()
    .int("Buffer must be an integer number of minutes")
    .min(0, "Buffer cannot be negative")
    .max(120, "Buffer cannot exceed 120 minutes")
    .default(0),
  is_active: z.boolean().default(true),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
