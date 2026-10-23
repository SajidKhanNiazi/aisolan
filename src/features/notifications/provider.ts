/**
 * BookPilot AI — Email Delivery Provider Abstraction & Adapters
 * Phase 1G-A: Production-Ready Resend Adapter & Testable Mock Provider
 */

import { Resend } from "resend";
import type {
  EmailDeliveryProvider,
  EmailSendPayload,
  EmailSendResult,
} from "./types";

/**
 * Production Resend Provider
 * Utilizes official Resend SDK. Keeps all API keys strictly server-side.
 */
export class ResendDeliveryProvider implements EmailDeliveryProvider {
  public readonly name = "resend";
  private client: Resend;
  private defaultFrom: string;
  private defaultReplyTo?: string | null;

  constructor(apiKey: string, defaultFrom?: string, defaultReplyTo?: string | null) {
    this.client = new Resend(apiKey);
    this.defaultFrom = defaultFrom || "BookPilot AI <notifications@bookpilot.ai>";
    this.defaultReplyTo = defaultReplyTo || null;
  }

  async sendEmail(payload: EmailSendPayload): Promise<EmailSendResult> {
    const fromAddress = payload.from || this.defaultFrom;
    const replyTo = payload.replyTo || this.defaultReplyTo || undefined;

    try {
      const response = await this.client.emails.send(
        {
          from: fromAddress,
          to: [payload.to],
          replyTo: replyTo ? [replyTo] : undefined,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        },
        payload.idempotencyKey
          ? {
              idempotencyKey: payload.idempotencyKey,
            }
          : undefined
      );

      if (response.error) {
        const err = response.error;
        console.error("[ResendDeliveryProvider] API delivery error:", {
          name: err.name,
          message: err.message,
        });

        // Determine if retryable (e.g. rate limits or server errors)
        const isRetryable =
          err.name === "rate_limit_exceeded" ||
          err.name === "internal_server_error" ||
          err.message.toLowerCase().includes("timeout") ||
          err.message.toLowerCase().includes("rate limit");

        return {
          success: false,
          errorCode: err.name || "RESEND_ERROR",
          errorMessage: err.message || "Failed to send email via Resend.",
          isRetryable,
        };
      }

      return {
        success: true,
        messageId: response.data?.id || `resend_${Date.now()}`,
      };
    } catch (error: unknown) {
      const err = error as Error;
      console.error("[ResendDeliveryProvider] Unexpected network error:", err.message);
      return {
        success: false,
        errorCode: "NETWORK_ERROR",
        errorMessage: err.message || "Network error connecting to email provider.",
        isRetryable: true,
      };
    }
  }
}

/**
 * Mock Email Provider for Local Development, Testing, and Unconfigured Environments
 * Safe by default: Never leaks credentials and does not attempt live network calls.
 */
export class MockDeliveryProvider implements EmailDeliveryProvider {
  public readonly name = "mock";
  private sentEmails: Array<EmailSendPayload & { timestamp: string; messageId: string }> = [];
  private shouldFailNext = false;
  private failErrorCode = "MOCK_PROVIDER_FAILURE";
  private isFailRetryable = true;

  setFailNext(shouldFail: boolean, code = "MOCK_PROVIDER_FAILURE", isRetryable = true): void {
    this.shouldFailNext = shouldFail;
    this.failErrorCode = code;
    this.isFailRetryable = isRetryable;
  }

  async sendEmail(payload: EmailSendPayload): Promise<EmailSendResult> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return {
        success: false,
        errorCode: this.failErrorCode,
        errorMessage: `Simulated mock provider failure [${this.failErrorCode}]`,
        isRetryable: this.isFailRetryable,
      };
    }

    const messageId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.sentEmails.push({
      ...payload,
      timestamp: new Date().toISOString(),
      messageId,
    });

    return {
      success: true,
      messageId,
    };
  }

  getSentEmails(): Array<EmailSendPayload & { timestamp: string; messageId: string }> {
    return [...this.sentEmails];
  }

  clear(): void {
    this.sentEmails = [];
    this.shouldFailNext = false;
  }
}

// Global singleton instance for testing inspection
export const globalMockEmailProvider = new MockDeliveryProvider();

/**
 * Resolves the configured active delivery provider based on server environment.
 * If RESEND_API_KEY is not configured or during testing, returns the safe Mock provider.
 */
export function getDeliveryProvider(forceMock = false): EmailDeliveryProvider {
  if (forceMock || process.env.NODE_ENV === "test") {
    return globalMockEmailProvider;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "mock" || apiKey === "mock_key") {
    return globalMockEmailProvider;
  }

  const emailFrom = process.env.EMAIL_FROM || "BookPilot AI <notifications@bookpilot.ai>";
  const emailReplyTo = process.env.EMAIL_REPLY_TO || null;

  return new ResendDeliveryProvider(apiKey.trim(), emailFrom.trim(), emailReplyTo?.trim());
}
