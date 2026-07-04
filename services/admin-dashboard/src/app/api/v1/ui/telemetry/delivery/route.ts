import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";
import { eventBus } from "@/lib/support/event-bus";

export async function GET(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;
  // Event Bus Delivery Telemetry (Phase 7 Orchestration)
  const status = eventBus.getStatus();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    event_bus: {
      last_sequence: status.last_sequence_processed,
      delivery_success_rate: calculateSuccessRate(status),
      pending_events: Object.values(status.delivery_records).filter(r => r.status === "pending").length,
      failed_events: Object.values(status.delivery_records).filter(r => r.status === "failed").length,
      records: status.delivery_records
    },
    usi_jobs: [
      { id: "job-usi-123", status: "active", steps_completed: 1, total_steps: 4 }
    ]
  });
}

function calculateSuccessRate(status: Record<string, unknown>): number {
  const records = (status.delivery_records ?? {}) as Record<string, Record<string, unknown>>;
  const total = Object.keys(records).length;
  if (total === 0) return 100;
  const delivered = Object.values(records).filter((r) => r.status === "delivered").length;
  return (delivered / total) * 100;
}
