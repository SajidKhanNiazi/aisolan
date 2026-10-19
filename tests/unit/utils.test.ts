import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("Utility (cn)", () => {
  it("should merge class names correctly and filter falsy values", () => {
    expect(cn("btn", "btn-primary")).toBe("btn btn-primary");
    expect(cn("btn", false && "hidden", null, undefined, "active")).toBe("btn active");
  });
});
