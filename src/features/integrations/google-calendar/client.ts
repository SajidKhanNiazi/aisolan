/**
 * BookPilot AI — Google Calendar API Client
 * Phase 1G-B: Lightweight Native REST Client for Google Calendar v3 API
 * Fully typed, zero external dependencies, robust rate-limiting and error classification.
 */

import type { CalendarSyncEventPayload, GoogleCalendarListItem } from "./types";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export interface GoogleCalendarEventInput {
  id?: string;
  summary: string;
  description: string;
  startIso: string;
  endIso: string;
  timeZone: string;
}

export interface GoogleApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  isRateLimited?: boolean;
  isAuthError?: boolean;
  isNotFound?: boolean;
  isConflict?: boolean;
}

/**
 * Formats a BookPilot sync payload into a clean, professional Google Calendar event input.
 */
export function buildGoogleEventInput(payload: CalendarSyncEventPayload): GoogleCalendarEventInput {
  const summary = `${payload.service_name} — ${payload.business_name} (${payload.booking_reference})`;

  const descriptionLines = [
    `📅 Appointment Reference: ${payload.booking_reference}`,
    `💇 Service: ${payload.service_name}`,
    `👤 Specialist: ${payload.staff_name}`,
    `🙋 Customer: ${payload.customer_name}`,
  ];

  if (payload.customer_phone) {
    descriptionLines.push(`📞 Phone: ${payload.customer_phone}`);
  }
  if (payload.customer_email) {
    descriptionLines.push(`✉️ Email: ${payload.customer_email}`);
  }
  if (payload.cancellation_reason) {
    descriptionLines.push(`❌ Cancellation Reason: ${payload.cancellation_reason}`);
  }

  descriptionLines.push("");
  descriptionLines.push(`Managed securely via Bookzello`);
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "test" ? "https://aisolan.vercel.app" : "https://bookzello.com");
  descriptionLines.push(`View workspace: ${appBaseUrl}/dashboard/${payload.business_slug}/appointments`);

  return {
    summary,
    description: descriptionLines.join("\n"),
    startIso: payload.starts_at,
    endIso: payload.service_ends_at,
    timeZone: payload.business_timezone || "Europe/London",
  };
}

/**
 * Lists calendars accessible to the authenticated Google user.
 */
export async function listUserCalendars(
  accessToken: string
): Promise<GoogleApiResult<GoogleCalendarListItem[]>> {
  try {
    const response = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList?minAccessRole=writer`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const status = response.status;

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        success: false,
        statusCode: status,
        isAuthError: status === 401,
        isRateLimited: status === 429 || status === 403,
        error: errorBody.error?.message || `Failed to fetch calendars (HTTP ${status})`,
      };
    }

    const data = await response.json();
    const items = (data.items || []) as Array<{
      id: string;
      summary: string;
      description?: string;
      primary?: boolean;
      accessRole?: string;
    }>;

    const calendars: GoogleCalendarListItem[] = items.map((c) => ({
      id: c.id,
      summary: c.summary,
      description: c.description,
      primary: Boolean(c.primary),
      accessRole: c.accessRole,
      canEdit: c.accessRole === "owner" || c.accessRole === "writer",
    }));

    return {
      success: true,
      data: calendars,
      statusCode: 200,
    };
  } catch (err: unknown) {
    const e = err as Error;
    return {
      success: false,
      error: `Network error connecting to Google Calendar API: ${e.message}`,
    };
  }
}

/**
 * Inserts a new appointment event into the destination Google Calendar.
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventInput: GoogleCalendarEventInput
): Promise<GoogleApiResult<{ id: string }>> {
  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...(eventInput.id ? { id: eventInput.id } : {}),
          summary: eventInput.summary,
          description: eventInput.description,
          start: {
            dateTime: eventInput.startIso,
            timeZone: eventInput.timeZone,
          },
          end: {
            dateTime: eventInput.endIso,
            timeZone: eventInput.timeZone,
          },
          status: "confirmed",
        }),
      }
    );

    const status = response.status;
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        statusCode: status,
        isAuthError: status === 401,
        isRateLimited: status === 429 || status === 403,
        isConflict: status === 409,
        error: data.error?.message || `Google API event creation failed (HTTP ${status})`,
      };
    }

    return {
      success: true,
      data: { id: data.id },
      statusCode: status,
    };
  } catch (err: unknown) {
    const e = err as Error;
    return {
      success: false,
      error: `Network error creating Google Calendar event: ${e.message}`,
    };
  }
}

/**
 * Updates an existing Google Calendar event.
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  eventInput: GoogleCalendarEventInput
): Promise<GoogleApiResult<{ id: string }>> {
  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
        eventId
      )}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          summary: eventInput.summary,
          description: eventInput.description,
          start: {
            dateTime: eventInput.startIso,
            timeZone: eventInput.timeZone,
          },
          end: {
            dateTime: eventInput.endIso,
            timeZone: eventInput.timeZone,
          },
          status: "confirmed",
        }),
      }
    );

    const status = response.status;
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        statusCode: status,
        isNotFound: status === 404,
        isAuthError: status === 401,
        isRateLimited: status === 429 || status === 403,
        error: data.error?.message || `Google API event update failed (HTTP ${status})`,
      };
    }

    return {
      success: true,
      data: { id: data.id },
      statusCode: status,
    };
  } catch (err: unknown) {
    const e = err as Error;
    return {
      success: false,
      error: `Network error updating Google Calendar event: ${e.message}`,
    };
  }
}

/**
 * Deletes a Google Calendar event upon appointment cancellation.
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<GoogleApiResult<{ deleted: boolean }>> {
  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
        eventId
      )}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    const status = response.status;

    // 204 No Content is standard success; 404 or 410 (already deleted) is treated as success
    if (status === 204 || status === 404 || status === 410) {
      return {
        success: true,
        data: { deleted: true },
        statusCode: status,
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      success: false,
      statusCode: status,
      isAuthError: status === 401,
      isRateLimited: status === 429 || status === 403,
      error: data.error?.message || `Google API event deletion failed (HTTP ${status})`,
    };
  } catch (err: unknown) {
    const e = err as Error;
    return {
      success: false,
      error: `Network error deleting Google Calendar event: ${e.message}`,
    };
  }
}
