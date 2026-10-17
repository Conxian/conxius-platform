import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { describe, it, expect } from "vitest";
import { calculateYieldSplitting, CloudSurfaceHealth } from "../app/api/v1/telemetry/route";

describe("Autonomous SLA Engine & 80/10/10 Yield Splitting (CON-1329 / CON-1600)", () => {
  const healthySurfaces: CloudSurfaceHealth[] = [
    { surface: "supabase_bos", status: "healthy", uptimePercentage: 99.98, latencyMs: 45 },
    { surface: "neon_postgres", status: "healthy", uptimePercentage: 99.99, latencyMs: 12 },
    { surface: "render_deployment", status: "healthy", uptimePercentage: 99.95, latencyMs: 90 },
  ];

  it("should calculate 80/10/10 yield splitting correctly when SLA is compliant", () => {
    const result = calculateYieldSplitting(100000, healthySurfaces);

    expect(result.totalYieldEarnedSats).toBe(100000);
    expect(result.lpAllocationSats).toBe(80000);
    expect(result.reservePoolSats).toBe(10000);
    expect(result.operationsUbiSats).toBe(10000);
    expect(result.slaCompliant).toBe(true);
    expect(result.penaltySlashedSats).toBe(0);
  });

  it("should apply penalty slashing when any cloud surface breaches SLA limits", () => {
    const degradedSurfaces: CloudSurfaceHealth[] = [
      { surface: "supabase_bos", status: "healthy", uptimePercentage: 99.98, latencyMs: 45 },
      { surface: "neon_postgres", status: "degraded", uptimePercentage: 95.0, latencyMs: 600 },
      { surface: "render_deployment", status: "healthy", uptimePercentage: 99.95, latencyMs: 90 },
    ];

    const result = calculateYieldSplitting(100000, degradedSurfaces);

    expect(result.slaCompliant).toBe(false);
    expect(result.penaltySlashedSats).toBe(5000);
    expect(result.lpAllocationSats).toBe(76000);
    expect(result.reservePoolSats).toBe(9500);
    expect(result.operationsUbiSats).toBe(9500);
  });

  it("should throw error if total yield earned is negative", () => {
    expect(() => calculateYieldSplitting(-100, healthySurfaces)).toThrow(
      "Total yield earned cannot be negative"
    );
  });
});
