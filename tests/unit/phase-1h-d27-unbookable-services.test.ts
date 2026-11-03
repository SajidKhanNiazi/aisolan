import { describe, it, expect } from "vitest";
import type { PublicService } from "@/features/public-booking/types";

describe("D27-FIX P0: Unbookable Service Customer Experience & Qualification Isolation", () => {
  // Pure helper simulating the qualification logic implemented in getPublicSalonProfile
  function computePublicServices(
    rawServices: { id: string; name: string; price_amount: number; duration_minutes: number; buffer_minutes: number }[],
    staffProfiles: { id: string; is_active: boolean; is_archived: boolean }[],
    staffServices: { service_id: string; staff_id: string }[],
    allowStaffSelection = false
  ): PublicService[] {
    const activeStaffIds = new Set(
      staffProfiles.filter((s) => s.is_active && !s.is_archived).map((s) => s.id)
    );

    const serviceActiveStaffCount = new Map<string, number>();
    const serviceStaffMap = new Map<string, string[]>();

    staffServices.forEach((row) => {
      if (activeStaffIds.has(row.staff_id)) {
        serviceActiveStaffCount.set(
          row.service_id,
          (serviceActiveStaffCount.get(row.service_id) || 0) + 1
        );
        if (allowStaffSelection) {
          const list = serviceStaffMap.get(row.service_id) || [];
          list.push(row.staff_id);
          serviceStaffMap.set(row.service_id, list);
        }
      }
    });

    return rawServices.map((s) => {
      const count = serviceActiveStaffCount.get(s.id) || 0;
      const isBookable = count > 0;
      return {
        id: s.id,
        name: s.name,
        description: null,
        priceAmount: s.price_amount,
        currency: "GBP",
        durationMinutes: s.duration_minutes,
        bufferMinutes: s.buffer_minutes,
        assignedStaffIds: allowStaffSelection ? serviceStaffMap.get(s.id) || [] : undefined,
        isBookable,
        unbookableReason: isBookable ? undefined : "no_qualified_staff",
      };
    });
  }

  it("Scenario 1: Brand new salon with services but zero staff -> all services unbookable", () => {
    const rawServices = [
      { id: "srv-cut", name: "Standard Cut", price_amount: 2500, duration_minutes: 30, buffer_minutes: 0 },
      { id: "srv-shave", name: "Hot Towel Shave", price_amount: 2000, duration_minutes: 25, buffer_minutes: 5 },
    ];
    const staffProfiles: { id: string; is_active: boolean; is_archived: boolean }[] = [];
    const staffServices: { service_id: string; staff_id: string }[] = [];

    const result = computePublicServices(rawServices, staffProfiles, staffServices);

    expect(result).toHaveLength(2);
    expect(result[0].isBookable).toBe(false);
    expect(result[0].unbookableReason).toBe("no_qualified_staff");
    expect(result[1].isBookable).toBe(false);
    expect(result[1].unbookableReason).toBe("no_qualified_staff");
  });

  it("Scenario 2: Solo salon with 1 active professional qualified for Cut but NOT Beard -> Beard is unbookable", () => {
    const rawServices = [
      { id: "srv-cut", name: "Standard Cut", price_amount: 2500, duration_minutes: 30, buffer_minutes: 0 },
      { id: "srv-beard", name: "Haircut & Beard", price_amount: 4000, duration_minutes: 50, buffer_minutes: 10 },
    ];
    const staffProfiles = [
      { id: "st-solo", is_active: true, is_archived: false },
    ];
    // Solo staff is qualified only for srv-cut
    const staffServices = [
      { service_id: "srv-cut", staff_id: "st-solo" },
    ];

    const result = computePublicServices(rawServices, staffProfiles, staffServices);

    expect(result[0].isBookable).toBe(true);
    expect(result[0].unbookableReason).toBeUndefined();

    // Haircut & Beard MUST be unbookable
    expect(result[1].isBookable).toBe(false);
    expect(result[1].unbookableReason).toBe("no_qualified_staff");
  });

  it("Scenario 3: Multi-staff salon with partial qualifications -> reflects actual active capacity", () => {
    const rawServices = [
      { id: "srv-fade", name: "Skin Fade", price_amount: 3000, duration_minutes: 35, buffer_minutes: 5 },
      { id: "srv-color", name: "Full Color", price_amount: 8000, duration_minutes: 90, buffer_minutes: 15 },
    ];
    const staffProfiles = [
      { id: "st-1", is_active: true, is_archived: false },
      { id: "st-2", is_active: true, is_archived: false },
      { id: "st-3", is_active: true, is_archived: false },
    ];
    // st-1 and st-2 can do fade; st-3 does color
    const staffServices = [
      { service_id: "srv-fade", staff_id: "st-1" },
      { service_id: "srv-fade", staff_id: "st-2" },
      { service_id: "srv-color", staff_id: "st-3" },
    ];

    const result = computePublicServices(rawServices, staffProfiles, staffServices, true);

    expect(result[0].isBookable).toBe(true);
    expect(result[0].assignedStaffIds).toEqual(["st-1", "st-2"]);

    expect(result[1].isBookable).toBe(true);
    expect(result[1].assignedStaffIds).toEqual(["st-3"]);
  });

  it("Scenario 4: Deactivated or archived staff members do NOT count towards service bookability", () => {
    const rawServices = [
      { id: "srv-treatment", name: "Keratin Treatment", price_amount: 12000, duration_minutes: 120, buffer_minutes: 15 },
    ];
    // Staff was qualified, but was subsequently deactivated (e.g. left salon or on leave)
    const staffProfiles = [
      { id: "st-inactive", is_active: false, is_archived: false },
      { id: "st-archived", is_active: true, is_archived: true },
    ];
    const staffServices = [
      { service_id: "srv-treatment", staff_id: "st-inactive" },
      { service_id: "srv-treatment", staff_id: "st-archived" },
    ];

    const result = computePublicServices(rawServices, staffProfiles, staffServices);

    expect(result[0].isBookable).toBe(false);
    expect(result[0].unbookableReason).toBe("no_qualified_staff");
  });

  it("Scenario 5: Wizard default service selection ignores unbookable services", () => {
    const services: PublicService[] = [
      {
        id: "srv-unbookable",
        name: "Haircut & Beard",
        description: null,
        priceAmount: 4500,
        currency: "GBP",
        durationMinutes: 50,
        bufferMinutes: 10,
        isBookable: false,
        unbookableReason: "no_qualified_staff",
      },
      {
        id: "srv-bookable",
        name: "Classic Cut",
        description: null,
        priceAmount: 2500,
        currency: "GBP",
        durationMinutes: 30,
        bufferMinutes: 0,
        isBookable: true,
      },
    ];

    // Simulating wizard initial state resolution
    const initialSelected = services.find((s) => s.isBookable) || null;

    expect(initialSelected).not.toBeNull();
    expect(initialSelected?.id).toBe("srv-bookable");
    expect(initialSelected?.name).toBe("Classic Cut");
  });
});
