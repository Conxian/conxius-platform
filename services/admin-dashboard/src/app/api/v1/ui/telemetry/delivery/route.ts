import { NextResponse } from "next/server";
import { eventBus } from "@/lib/support/event-bus";

export async function GET() {
  // Event Bus Delivery Telemetry
  const status = eventBus.getStatus();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    event_bus: {
      last_sequence: status.last_sequence_processed,
      delivery_success_rate: calculateSuccessRate(status),
      pending_events: Object.values(status.delivery_records).filter(r => r.status === "pending").length,
      failed_events: Object.values(status.delivery_records).filter(r => r.status === "failed").length,
      records: status.delivery_records
    }
  });
}

function calculateSuccessRate(status: any): number {
  const total = Object.keys(status.delivery_records).length;
  if (total === 0) return 100;
  const delivered = Object.values(status.delivery_records).filter((r: any) => r.status === "delivered").length;
  return (delivered / total) * 100;
}
