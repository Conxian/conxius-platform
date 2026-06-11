
import { randomUUID } from "crypto";
import type { CrossChainEvent, EventBusState, EventDeliveryStatus, EventDeliveryRecord } from "../sidl/types";
import { getSidlStateSnapshot } from "../sidl/stateStore";
import fs from "fs";
import path from "path";

// In-memory runtime state for POC (would be in stateStore.ts for persistence)
let runtimeState: EventBusState = {
  last_sequence_processed: 0,
  delivery_records: {}
};

const MAX_RETRIES = 3;

/**
 * Gateway Event Delivery Runtime
 * Consumes events from the Nexus canonical feed and delivers to downstream adapters.
 */
export class EventDeliveryRuntime {
  private static instance: EventDeliveryRuntime;

  private constructor() {}

  public static getInstance(): EventDeliveryRuntime {
    if (!EventDeliveryRuntime.instance) {
      EventDeliveryRuntime.instance = new EventDeliveryRuntime();
    }
    return EventDeliveryRuntime.instance;
  }

  /**
   * Process a batch of events from Nexus.
   */
  public async processBatch(events: CrossChainEvent[]): Promise<void> {
    const sortedEvents = [...events].sort((a, b) => a.sequence_number - b.sequence_number);

    for (const event of sortedEvents) {
      if (event.sequence_number <= runtimeState.last_sequence_processed) {
        continue;
      }

      await this.deliverEvent(event);
      runtimeState.last_sequence_processed = event.sequence_number;
    }
  }

  /**
   * Internal delivery logic with retry policy.
   */
  private async deliverEvent(event: CrossChainEvent): Promise<void> {
    const record: EventDeliveryRecord = runtimeState.delivery_records[event.id] || {
      event_id: event.id,
      status: "pending",
      retry_count: 0
    };

    try {
      console.log(`[EventBus] Delivering event ${event.id} (type: ${event.event_type})`);

      // Simulate delivery to downstream transport adapters (e.g. Webhook, Nostr, Websocket)
      await this.simulateAdapterDelivery(event);

      record.status = "delivered";
      record.last_attempt_at_iso = new Date().toISOString();
    } catch (error: any) {
      record.retry_count += 1;
      record.error = error.message;

      if (record.retry_count <= MAX_RETRIES) {
        record.status = "retrying";
        console.warn(`[EventBus] Delivery failed for ${event.id}, retrying (${record.retry_count}/${MAX_RETRIES})`);
        // In a real system, we'd schedule a background job here
      } else {
        record.status = "failed";
        console.error(`[EventBus] Delivery permanently failed for ${event.id}: ${error.message}`);
      }
    }

    runtimeState.delivery_records[event.id] = record;
  }

  private async simulateAdapterDelivery(event: CrossChainEvent): Promise<void> {
    // POC implementation: simulate success 90% of the time
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          resolve();
        } else {
          reject(new Error("Downstream adapter timeout"));
        }
      }, 50);
    });
  }

  public getStatus(): EventBusState {
    return { ...runtimeState };
  }
}

export const eventBus = EventDeliveryRuntime.getInstance();
