/**
 * Deterministic ID generation — replaces Math.random() for traceable identifiers.
 *
 * Uses crypto.randomUUID() for unique IDs and a sequential counter for
 * deterministic test scenarios. All IDs are prefixed for traceability.
 */

let _seq = 0;

/** Reset the sequence counter (for testing). */
export function resetIdSequence(): void {
  _seq = 0;
}

/** Generate a unique ID with a prefix, e.g. `bitvmx-a1b2c3d4`. */
export function generateId(prefix: string): string {
  _seq += 1;
  const suffix = crypto.randomUUID().split("-")[0]!;
  return `${prefix}-${suffix}-${_seq.toString(36)}`;
}

/** Generate a short numeric token for ticket/support IDs. */
export function generateTicketToken(prefix: string): string {
  const date = new Date().toISOString().split("T")[0]!.replace(/-/g, "");
  _seq += 1;
  return `${prefix}-${date}-${_seq.toString(36).padStart(4, "0")}`;
}
