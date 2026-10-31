/**
 * Bookzello — Phase 1H-D1 WhatsApp Outbound Client Abstraction
 * Supports Official Meta WhatsApp Cloud API and local Mock transport.
 */

import { isWhatsAppOutboundEnabled, getWhatsAppConfig, isRecipientAuthorizedForWhatsAppPilot } from "./config";
import type { WhatsAppSendResult } from "./types";

export interface OutboundTextMessageOptions {
  recipientWaId: string;
  phoneNumberId: string;
  text: string;
  previewUrl?: boolean;
}

export interface OutboundButtonOptions {
  recipientWaId: string;
  phoneNumberId: string;
  bodyText: string;
  headerText?: string;
  footerText?: string;
  buttons: Array<{
    id: string;
    title: string;
  }>;
}

export interface OutboundTemplateOptions {
  recipientWaId: string;
  phoneNumberId: string;
  templateName: string;
  languageCode: string;
  components?: unknown[];
}

export interface WhatsAppOutboundClient {
  sendTextMessage(options: OutboundTextMessageOptions): Promise<WhatsAppSendResult>;
  sendInteractiveButtons(options: OutboundButtonOptions): Promise<WhatsAppSendResult>;
  sendTemplateMessage(options: OutboundTemplateOptions): Promise<WhatsAppSendResult>;
}

/**
 * Mock WhatsApp Outbound Client for tests, QA and local development.
 * Never performs real network requests.
 */
export class MockWhatsAppClient implements WhatsAppOutboundClient {
  public sentMessages: Array<{
    type: "text" | "interactive_button" | "template";
    options: unknown;
    timestamp: string;
  }> = [];

  async sendTextMessage(options: OutboundTextMessageOptions): Promise<WhatsAppSendResult> {
    const messageId = `wamid.mock_txt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sentMessages.push({
      type: "text",
      options,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      messageId,
      mode: "mock",
    };
  }

  async sendInteractiveButtons(options: OutboundButtonOptions): Promise<WhatsAppSendResult> {
    const messageId = `wamid.mock_btn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sentMessages.push({
      type: "interactive_button",
      options,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      messageId,
      mode: "mock",
    };
  }

  async sendTemplateMessage(options: OutboundTemplateOptions): Promise<WhatsAppSendResult> {
    const messageId = `wamid.mock_tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sentMessages.push({
      type: "template",
      options,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      messageId,
      mode: "mock",
    };
  }

  clear(): void {
    this.sentMessages = [];
  }
}

/**
 * Official Meta WhatsApp Cloud API Client
 * Only dispatches live network requests when WHATSAPP_OUTBOUND_ENABLED=true.
 */
export class MetaWhatsAppCloudApiClient implements WhatsAppOutboundClient {
  private config = getWhatsAppConfig();

  private getGraphUrl(phoneNumberId: string): string {
    return `https://graph.facebook.com/${this.config.graphApiVersion}/${phoneNumberId}/messages`;
  }

  async sendTextMessage(options: OutboundTextMessageOptions): Promise<WhatsAppSendResult> {
    if (!isWhatsAppOutboundEnabled()) {
      return {
        success: false,
        error: "WhatsApp outbound sending is disabled by configuration (WHATSAPP_OUTBOUND_ENABLED=false)",
        errorCode: "OUTBOUND_DISABLED",
        mode: "disabled",
      };
    }

    if (!isRecipientAuthorizedForWhatsAppPilot(options.recipientWaId)) {
      return {
        success: false,
        error: `Recipient '${options.recipientWaId}' is not in the authorized test recipients list (WHATSAPP_AUTHORIZED_TEST_RECIPIENTS)`,
        errorCode: "UNAUTHORIZED_RECIPIENT",
        mode: "meta_cloud_api",
      };
    }

    if (!this.config.accessToken) {
      return {
        success: false,
        error: "Missing WhatsApp Cloud API access token",
        errorCode: "MISSING_ACCESS_TOKEN",
        mode: "meta_cloud_api",
      };
    }

    try {
      const url = this.getGraphUrl(options.phoneNumberId);
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: options.recipientWaId,
        type: "text",
        text: {
          preview_url: options.previewUrl ?? false,
          body: options.text,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as {
        messages?: Array<{ id: string }>;
        error?: { message: string; code: number; fbtrace_id?: string };
      };

      if (!res.ok || data.error) {
        return {
          success: false,
          error: data.error?.message || `HTTP ${res.status}: Failed to send WhatsApp message`,
          errorCode: data.error?.code ? String(data.error.code) : `HTTP_${res.status}`,
          mode: "meta_cloud_api",
        };
      }

      const messageId = data.messages?.[0]?.id || `wamid.meta_${Date.now()}`;
      return {
        success: true,
        messageId,
        mode: "meta_cloud_api",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown Meta API error";
      return {
        success: false,
        error: msg,
        errorCode: "NETWORK_ERROR",
        mode: "meta_cloud_api",
      };
    }
  }

  async sendInteractiveButtons(options: OutboundButtonOptions): Promise<WhatsAppSendResult> {
    if (!isWhatsAppOutboundEnabled()) {
      return {
        success: false,
        error: "WhatsApp outbound sending is disabled by configuration (WHATSAPP_OUTBOUND_ENABLED=false)",
        errorCode: "OUTBOUND_DISABLED",
        mode: "disabled",
      };
    }

    if (!this.config.accessToken) {
      return {
        success: false,
        error: "Missing WhatsApp Cloud API access token",
        errorCode: "MISSING_ACCESS_TOKEN",
        mode: "meta_cloud_api",
      };
    }

    try {
      const url = this.getGraphUrl(options.phoneNumberId);
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: options.recipientWaId,
        type: "interactive",
        interactive: {
          type: "button",
          header: options.headerText ? { type: "text", text: options.headerText } : undefined,
          body: { text: options.bodyText },
          footer: options.footerText ? { text: options.footerText } : undefined,
          action: {
            buttons: options.buttons.slice(0, 3).map((btn) => ({
              type: "reply",
              reply: {
                id: btn.id,
                title: btn.title.slice(0, 20), // Meta limit 20 chars
              },
            })),
          },
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as {
        messages?: Array<{ id: string }>;
        error?: { message: string; code: number };
      };

      if (!res.ok || data.error) {
        return {
          success: false,
          error: data.error?.message || `HTTP ${res.status}: Failed to send interactive buttons`,
          errorCode: data.error?.code ? String(data.error.code) : `HTTP_${res.status}`,
          mode: "meta_cloud_api",
        };
      }

      const messageId = data.messages?.[0]?.id || `wamid.meta_${Date.now()}`;
      return {
        success: true,
        messageId,
        mode: "meta_cloud_api",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown Meta API error";
      return {
        success: false,
        error: msg,
        errorCode: "NETWORK_ERROR",
        mode: "meta_cloud_api",
      };
    }
  }

  async sendTemplateMessage(options: OutboundTemplateOptions): Promise<WhatsAppSendResult> {
    if (!isWhatsAppOutboundEnabled()) {
      return {
        success: false,
        error: "WhatsApp outbound sending is disabled by configuration (WHATSAPP_OUTBOUND_ENABLED=false)",
        errorCode: "OUTBOUND_DISABLED",
        mode: "disabled",
      };
    }

    if (!this.config.accessToken) {
      return {
        success: false,
        error: "Missing WhatsApp Cloud API access token",
        errorCode: "MISSING_ACCESS_TOKEN",
        mode: "meta_cloud_api",
      };
    }

    try {
      const url = this.getGraphUrl(options.phoneNumberId);
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: options.recipientWaId,
        type: "template",
        template: {
          name: options.templateName,
          language: { code: options.languageCode },
          components: options.components,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as {
        messages?: Array<{ id: string }>;
        error?: { message: string; code: number };
      };

      if (!res.ok || data.error) {
        return {
          success: false,
          error: data.error?.message || `HTTP ${res.status}: Failed to send WhatsApp template`,
          errorCode: data.error?.code ? String(data.error.code) : `HTTP_${res.status}`,
          mode: "meta_cloud_api",
        };
      }

      const messageId = data.messages?.[0]?.id || `wamid.meta_${Date.now()}`;
      return {
        success: true,
        messageId,
        mode: "meta_cloud_api",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown Meta API error";
      return {
        success: false,
        error: msg,
        errorCode: "NETWORK_ERROR",
        mode: "meta_cloud_api",
      };
    }
  }
}

// Global default mock instance for test inspection
export const defaultMockWhatsAppClient = new MockWhatsAppClient();

/**
 * Factory for obtaining the appropriate WhatsApp Outbound client.
 */
export function getWhatsAppOutboundClient(forceMock = false): WhatsAppOutboundClient {
  if (forceMock || process.env.NODE_ENV === "test") {
    return defaultMockWhatsAppClient;
  }
  return new MetaWhatsAppCloudApiClient();
}
