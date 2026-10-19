import { describe, it, expect } from "vitest";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/features/auth/validation";

describe("Phase 1B — Auth Validation Schemas", () => {
  describe("signupSchema", () => {
    it("accepts valid registration data", () => {
      const valid = {
        full_name: "Jane Barber",
        email: "jane@example.com",
        password: "Password123!",
        confirm_password: "Password123!",
      };
      const result = signupSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects short full names", () => {
      const invalid = {
        full_name: "J",
        email: "jane@example.com",
        password: "Password123!",
        confirm_password: "Password123!",
      };
      const result = signupSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/at least 2 characters/i);
      }
    });

    it("rejects invalid emails", () => {
      const invalid = {
        full_name: "Jane Barber",
        email: "not-an-email",
        password: "Password123!",
        confirm_password: "Password123!",
      };
      const result = signupSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/valid email/i);
      }
    });

    it("rejects passwords under 8 characters", () => {
      const invalid = {
        full_name: "Jane Barber",
        email: "jane@example.com",
        password: "Pass1",
        confirm_password: "Pass1",
      };
      const result = signupSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/at least 8 characters/i);
      }
    });

    it("rejects mismatched confirm password", () => {
      const invalid = {
        full_name: "Jane Barber",
        email: "jane@example.com",
        password: "Password123!",
        confirm_password: "DifferentPassword123!",
      };
      const result = signupSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/passwords do not match/i);
      }
    });
  });

  describe("loginSchema", () => {
    it("accepts valid email and password", () => {
      const result = loginSchema.safeParse({
        email: "owner@salon.com",
        password: "SecretPassword1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing or invalid email", () => {
      const result = loginSchema.safeParse({
        email: "bad-email",
        password: "SecretPassword1",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "owner@salon.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("accepts valid email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "recover@salon.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "invalid-email",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts matching new password", () => {
      const result = resetPasswordSchema.safeParse({
        password: "NewPassword123!",
        confirm_password: "NewPassword123!",
      });
      expect(result.success).toBe(true);
    });

    it("rejects mismatched new password", () => {
      const result = resetPasswordSchema.safeParse({
        password: "NewPassword123!",
        confirm_password: "WrongPassword!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/passwords do not match/i);
      }
    });
  });
});
