import { z } from "zod";

export const createBusinessSchema = z.object({
  name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must not exceed 100 characters")
    .trim(),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(60, "Slug must not exceed 60 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, numbers, and hyphens (e.g., 'modern-cuts')"
    )
    .trim(),
  business_type: z.enum(
    ["salon", "barbershop", "spa", "trainer", "other"],
    { message: "Please select a valid business category" }
  ),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters")
    .trim(),
  avatar_url: z.string().url("Please provide a valid URL").optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
