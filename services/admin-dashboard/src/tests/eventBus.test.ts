import { describe, it, expect, beforeEach } from "vitest";
import { EventDeliveryRuntime } from "../lib/support/event-bus";
import type { CrossChainEvent } from "../lib/sidl/types";

describe("Event Bus Delivery Runtime", () => {
  let runtime: any;

  beforeEach(() => {
    runtime = EventDeliveryRuntime.getInstance();
  });

  it("should process a batch of events and update last sequence", async () => {
    const events: CrossChainEvent[] = [
      {
        id: "evt-1",
        source_chain: "bitcoin",
        destination_chain: "stacks",
        event_type: "DEPOSIT",
        payload: { amount: 100 },
        sequence_number: 1,
        nexus_id: "nexus-1",
        nexus_signature: "sig-1",
        occurred_at_iso: new Date().toISOString()
      },
      {
        id: "evt-2",
        source_chain: "stacks",
        destination_chain: "bitcoin",
        event_type: "WITHDRAW",
        payload: { amount: 50 },
        sequence_number: 2,
        nexus_id: "nexus-1",
        nexus_signature: "sig-2",
        occurred_at_iso: new Date().toISOString()
      }
    ];

    await runtime.processBatch(events);
    const status = runtime.getStatus();

    expect(status.last_sequence_processed).toBe(2);
    expect(Object.keys(status.delivery_records).length).toBe(2);
  });

  it("should skip already processed events", async () => {
    const events: CrossChainEvent[] = [
      {
        id: "evt-1",
        source_chain: "bitcoin",
        destination_chain: "stacks",
        event_type: "DEPOSIT",
        payload: { amount: 100 },
        sequence_number: 1,
        nexus_id: "nexus-1",
        nexus_signature: "sig-1",
        occurred_at_iso: new Date().toISOString()
      }
    ];

    await runtime.processBatch(events);
    const statusBefore = runtime.getStatus();

    await runtime.processBatch(events);
    const statusAfter = runtime.getStatus();

    expect(statusAfter.last_sequence_processed).toBe(statusBefore.last_sequence_processed);
  });
});
