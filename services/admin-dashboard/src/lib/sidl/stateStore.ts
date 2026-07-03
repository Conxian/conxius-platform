import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { DEFAULT_CART_MANDATES, DEFAULT_OPERATORS, DEFAULT_SIDL_PROPOSALS } from "./defaults";
import type {
  CartMandate,
  CheckoutEvent,
  CheckoutLifecycleState,
  OperatorEntry,
  OperatorRegistry,
  SidlProposal,
  VoteChoice,
  VoteEvent,
  VoteReceipt,
  VoteTally,
  X402PaymentRequired,
} from "./types";

const STATE_SCHEMA_VERSION = 1;
const STATE_FILE_ENV = "SIDL_STATE_FILE";
const DEFAULT_STATE_FILE = ".sidl-state.json";

type PersistedCheckoutRecord = {
  state: CheckoutLifecycleState;
  events: CheckoutEvent[];
};

export type PersistedSidlState = {
  schemaVersion: number;
  proposals: Record<string, SidlProposal>;
  voteEvents: VoteEvent[];
  voteTallies: Record<string, VoteTally>;
  cartMandates: Record<string, CartMandate>;
  checkoutByMandate: Record<string, PersistedCheckoutRecord>;
  operators: Record<string, OperatorEntry>;
  updatedAtIso: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneCartMandate(mandate: CartMandate): CartMandate {
  return {
    ...mandate,
    items: mandate.items.map((item) => ({ ...item })),
  };
}

function cloneProposal(proposal: SidlProposal): SidlProposal {
  return { ...proposal };
}

function cloneVoteTally(tally: VoteTally): VoteTally {
  return { ...tally };
}

function cloneCheckoutState(state: CheckoutLifecycleState): CheckoutLifecycleState {
  return { ...state };
}

function cloneCheckoutEvent(event: CheckoutEvent): CheckoutEvent {
  return {
    ...event,
    paymentRequired: event.paymentRequired ? { ...event.paymentRequired } : undefined,
  };
}

function cloneCheckoutRecord(record: PersistedCheckoutRecord): PersistedCheckoutRecord {
  return {
    state: cloneCheckoutState(record.state),
    events: record.events.map(cloneCheckoutEvent),
  };
}

function cloneOperatorEntry(entry: OperatorEntry): OperatorEntry {
  return { ...entry };
}

function cloneState(state: PersistedSidlState): PersistedSidlState {
  return {
    schemaVersion: state.schemaVersion,
    proposals: Object.fromEntries(Object.entries(state.proposals).map(([id, proposal]) => [id, cloneProposal(proposal)])),
    voteEvents: state.voteEvents.map((event) => ({ ...event })),
    voteTallies: Object.fromEntries(Object.entries(state.voteTallies).map(([id, tally]) => [id, cloneVoteTally(tally)])),
    cartMandates: Object.fromEntries(Object.entries(state.cartMandates).map(([id, mandate]) => [id, cloneCartMandate(mandate)])),
    checkoutByMandate: Object.fromEntries(
      Object.entries(state.checkoutByMandate).map(([id, record]) => [id, cloneCheckoutRecord(record)])
    ),
    operators: Object.fromEntries(Object.entries(state.operators).map(([id, entry]) => [id, cloneOperatorEntry(entry)])),
    updatedAtIso: state.updatedAtIso,
  };
}

function toNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function toIsoTimestamp(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return fallback;
  return new Date(parsed).toISOString();
}

function parseProposal(id: string, raw: unknown): SidlProposal | null {
  if (!isRecord(raw)) return null;

  const createdAtIso = toIsoTimestamp(raw.createdAtIso, new Date().toISOString());
  const updatedAtIso = toIsoTimestamp(raw.updatedAtIso, createdAtIso);
  const title = typeof raw.title === "string" && raw.title.trim().length > 0 ? raw.title : id;
  const status = raw.status === "closed" ? "closed" : "open";

  return {
    id,
    title,
    description: typeof raw.description === "string" ? raw.description : undefined,
    status,
    createdAtIso,
    updatedAtIso,
  };
}

function parseVoteEvent(raw: unknown): VoteEvent | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.proposalId !== "string") return null;
  if (typeof raw.fid !== "number" || !Number.isFinite(raw.fid)) return null;
  if (raw.choice !== "yes" && raw.choice !== "no") return null;

  const recordedAtIso = toIsoTimestamp(raw.recordedAtIso, new Date().toISOString());

  return {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : randomUUID(),
    proposalId: raw.proposalId,
    fid: Math.floor(raw.fid),
    choice: raw.choice,
    recordedAtIso,
  };
}

function parseVoteTally(id: string, raw: unknown): VoteTally | null {
  if (!isRecord(raw)) return null;
  return {
    proposalId: id,
    yes: toNonNegativeInteger(raw.yes),
    no: toNonNegativeInteger(raw.no),
  };
}

function parseCartMandate(id: string, raw: unknown): CartMandate | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.title !== "string" || typeof raw.totalUsd !== "string") return null;
  if (!Array.isArray(raw.items)) return null;

  const items = raw.items
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      sku: typeof item.sku === "string" ? item.sku : "",
      name: typeof item.name === "string" ? item.name : "",
      quantity: toNonNegativeInteger(item.quantity),
      unitUsd: typeof item.unitUsd === "string" ? item.unitUsd : "0.00",
    }))
    .filter((item) => item.sku.length > 0 && item.name.length > 0);

  if (items.length === 0) return null;

  return {
    id,
    title: raw.title,
    items,
    totalUsd: raw.totalUsd,
    createdAtIso: toIsoTimestamp(raw.createdAtIso, new Date().toISOString()),
  };
}

function parseCheckoutState(mandateId: string, raw: unknown): CheckoutLifecycleState | null {
  if (!isRecord(raw)) return null;

  const status =
    raw.status === "payment-required" || raw.status === "payment-attempted" || raw.status === "settled"
      ? raw.status
      : "not-started";

  const fallbackIso = new Date().toISOString();

  return {
    mandateId,
    status,
    challengeCount: toNonNegativeInteger(raw.challengeCount),
    paymentAttemptCount: toNonNegativeInteger(raw.paymentAttemptCount),
    settledCount: toNonNegativeInteger(raw.settledCount),
    lastEventAtIso: toIsoTimestamp(raw.lastEventAtIso, fallbackIso),
    lastPaymentRequiredAtIso: typeof raw.lastPaymentRequiredAtIso === "string" ? toIsoTimestamp(raw.lastPaymentRequiredAtIso, fallbackIso) : undefined,
    lastPaymentAttemptAtIso: typeof raw.lastPaymentAttemptAtIso === "string" ? toIsoTimestamp(raw.lastPaymentAttemptAtIso, fallbackIso) : undefined,
    lastSettledAtIso: typeof raw.lastSettledAtIso === "string" ? toIsoTimestamp(raw.lastSettledAtIso, fallbackIso) : undefined,
  };
}

function parseCheckoutEvent(mandateId: string, raw: unknown): CheckoutEvent | null {
  if (!isRecord(raw)) return null;

  const type = raw.type;
  if (type !== "payment-required" && type !== "payment-attempted" && type !== "payment-settled") {
    return null;
  }

  const event: CheckoutEvent = {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : randomUUID(),
    mandateId,
    type,
    occurredAtIso: toIsoTimestamp(raw.occurredAtIso, new Date().toISOString()),
    resource: typeof raw.resource === "string" ? raw.resource : "",
    paymentSignaturePresent: raw.paymentSignaturePresent === true,
    paymentSignatureSha256:
      typeof raw.paymentSignatureSha256 === "string" && raw.paymentSignatureSha256.length > 0
        ? raw.paymentSignatureSha256
        : undefined,
    paymentRequired: isRecord(raw.paymentRequired)
      ? {
          maxAmountRequired:
            typeof raw.paymentRequired.maxAmountRequired === "string" ? raw.paymentRequired.maxAmountRequired : "0",
          resource: typeof raw.paymentRequired.resource === "string" ? raw.paymentRequired.resource : "",
          description: typeof raw.paymentRequired.description === "string" ? raw.paymentRequired.description : undefined,
          payTo: typeof raw.paymentRequired.payTo === "string" ? raw.paymentRequired.payTo : "",
          asset: typeof raw.paymentRequired.asset === "string" ? raw.paymentRequired.asset : "",
          network: typeof raw.paymentRequired.network === "string" ? raw.paymentRequired.network : "",
        }
      : undefined,
  };

  return event;
}

function parseCheckoutRecord(mandateId: string, raw: unknown): PersistedCheckoutRecord | null {
  if (!isRecord(raw)) return null;

  const parsedState = parseCheckoutState(mandateId, raw.state);
  if (!parsedState) return null;

  const events = Array.isArray(raw.events)
    ? raw.events.map((event) => parseCheckoutEvent(mandateId, event)).filter((event): event is CheckoutEvent => event !== null)
    : [];

  return {
    state: parsedState,
    events,
  };
}

function parseOperatorEntry(id: string, raw: unknown): OperatorEntry | null {
  if (!isRecord(raw)) return null;

  const validRoles = ["frontend-host", "delegate", "maintainer", "steward"];
  const role = typeof raw.role === "string" && validRoles.includes(raw.role)
    ? (raw.role as OperatorEntry["role"])
    : "steward";

  const validStatuses = ["active", "inactive"];
  const status = typeof raw.status === "string" && validStatuses.includes(raw.status)
    ? (raw.status as OperatorEntry["status"])
    : "active";

  if (typeof raw.name !== "string" || raw.name.trim().length === 0) return null;
  if (typeof raw.service !== "string" || raw.service.trim().length === 0) return null;

  return {
    id,
    name: raw.name.trim(),
    role,
    service: raw.service.trim(),
    description: typeof raw.description === "string" && raw.description.trim().length > 0 ? raw.description.trim() : raw.service.trim(),
    recognizedBy: typeof raw.recognizedBy === "string" ? raw.recognizedBy : "",
    recognizedAtIso: toIsoTimestamp(raw.recognizedAtIso, new Date().toISOString()),
    status,
    contact: typeof raw.contact === "string" && raw.contact.trim().length > 0 ? raw.contact.trim() : undefined,
  };
}

function resolveStatePath(): string {
  const configured = process.env[STATE_FILE_ENV]?.trim();
  return configured ? path.resolve(configured) : path.resolve(process.cwd(), DEFAULT_STATE_FILE);
}

export function getSidlStateFilePath(): string {
  return resolveStatePath();
}

function defaultTalliesForProposals(proposals: Record<string, SidlProposal>): Record<string, VoteTally> {
  return Object.fromEntries(
    Object.keys(proposals).map((proposalId) => [
      proposalId,
      {
        proposalId,
        yes: 0,
        no: 0,
      },
    ])
  );
}

function createDefaultState(nowIso: string): PersistedSidlState {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    proposals: Object.fromEntries(
      Object.entries(DEFAULT_SIDL_PROPOSALS).map(([id, proposal]) => [id, cloneProposal(proposal)])
    ),
    voteEvents: [],
    voteTallies: defaultTalliesForProposals(DEFAULT_SIDL_PROPOSALS),
    cartMandates: Object.fromEntries(
      Object.entries(DEFAULT_CART_MANDATES).map(([id, mandate]) => [id, cloneCartMandate(mandate)])
    ),
    checkoutByMandate: {},
    operators: Object.fromEntries(
      Object.entries(DEFAULT_OPERATORS).map(([id, entry]) => [id, cloneOperatorEntry(entry)])
    ),
    updatedAtIso: nowIso,
  };
}

function hydrateState(raw: unknown, nowIso: string): PersistedSidlState {
  const seeded = createDefaultState(nowIso);
  if (!isRecord(raw)) return seeded;

  const hydrated: PersistedSidlState = {
    ...seeded,
    schemaVersion: raw.schemaVersion === STATE_SCHEMA_VERSION ? STATE_SCHEMA_VERSION : seeded.schemaVersion,
    proposals: {},
    voteEvents: [],
    voteTallies: {},
    cartMandates: {},
    checkoutByMandate: {},
    operators: {},
  };

  if (isRecord(raw.proposals)) {
    for (const [id, proposalRaw] of Object.entries(raw.proposals)) {
      const parsed = parseProposal(id, proposalRaw);
      if (parsed) {
        hydrated.proposals[id] = parsed;
      }
    }
  }

  if (Array.isArray(raw.voteEvents)) {
    hydrated.voteEvents = raw.voteEvents
      .map((event) => parseVoteEvent(event))
      .filter((event): event is VoteEvent => event !== null);
  }

  if (isRecord(raw.voteTallies)) {
    for (const [id, tallyRaw] of Object.entries(raw.voteTallies)) {
      const parsed = parseVoteTally(id, tallyRaw);
      if (parsed) {
        hydrated.voteTallies[id] = parsed;
      }
    }
  }

  if (isRecord(raw.cartMandates)) {
    for (const [id, mandateRaw] of Object.entries(raw.cartMandates)) {
      const parsed = parseCartMandate(id, mandateRaw);
      if (parsed) {
        hydrated.cartMandates[id] = parsed;
      }
    }
  }

  if (isRecord(raw.checkoutByMandate)) {
    for (const [id, recordRaw] of Object.entries(raw.checkoutByMandate)) {
      const parsed = parseCheckoutRecord(id, recordRaw);
      if (parsed) {
        hydrated.checkoutByMandate[id] = parsed;
      }
    }
  }

  if (isRecord(raw.operators)) {
    for (const [id, entryRaw] of Object.entries(raw.operators)) {
      const parsed = parseOperatorEntry(id, entryRaw);
      if (parsed) {
        hydrated.operators[id] = parsed;
      }
    }
  }

  hydrated.updatedAtIso = toIsoTimestamp(raw.updatedAtIso, nowIso);
  applySeedDefaults(hydrated, nowIso);

  return hydrated;
}

function applySeedDefaults(state: PersistedSidlState, nowIso: string): boolean {
  let changed = false;

  for (const [proposalId, proposal] of Object.entries(DEFAULT_SIDL_PROPOSALS)) {
    if (!state.proposals[proposalId]) {
      state.proposals[proposalId] = cloneProposal(proposal);
      changed = true;
    }

    if (!state.voteTallies[proposalId]) {
      state.voteTallies[proposalId] = { proposalId, yes: 0, no: 0 };
      changed = true;
    }
  }

  for (const [mandateId, mandate] of Object.entries(DEFAULT_CART_MANDATES)) {
    if (!state.cartMandates[mandateId]) {
      state.cartMandates[mandateId] = cloneCartMandate(mandate);
      changed = true;
    }
  }

  for (const [operatorId, entry] of Object.entries(DEFAULT_OPERATORS)) {
    if (!state.operators[operatorId]) {
      state.operators[operatorId] = cloneOperatorEntry(entry);
      changed = true;
    }
  }

  if (changed) {
    state.updatedAtIso = nowIso;
  }

  return changed;
}

function persistState(filePath: string, state: PersistedSidlState): void {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  const payload = `${JSON.stringify(state, null, 2)}\n`;
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, payload, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

function loadStateFromDisk(filePath: string): PersistedSidlState | null {
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return null;

  const parsed = JSON.parse(raw) as unknown;
  return hydrateState(parsed, new Date().toISOString());
}

function loadState(filePath: string): PersistedSidlState {
  const nowIso = new Date().toISOString();
  const existing = loadStateFromDisk(filePath);

  if (!existing) {
    const seeded = createDefaultState(nowIso);
    persistState(filePath, seeded);
    return seeded;
  }

  const changed = applySeedDefaults(existing, nowIso);
  if (changed) {
    persistState(filePath, existing);
  }

  return existing;
}

function writeMutatedState(mutator: (state: PersistedSidlState) => void): PersistedSidlState {
  const filePath = resolveStatePath();
  const state = loadState(filePath);
  mutator(state);
  persistState(filePath, state);
  return state;
}

function humanizeProposalId(proposalId: string): string {
  return proposalId
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function ensureProposal(state: PersistedSidlState, proposalId: string, nowIso: string): boolean {
  let changed = false;

  if (!state.proposals[proposalId]) {
    state.proposals[proposalId] = {
      id: proposalId,
      title: humanizeProposalId(proposalId) || proposalId,
      status: "open",
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };
    changed = true;
  }

  if (!state.voteTallies[proposalId]) {
    state.voteTallies[proposalId] = {
      proposalId,
      yes: 0,
      no: 0,
    };
    changed = true;
  }

  return changed;
}

function getOrCreateCheckoutRecord(
  state: PersistedSidlState,
  mandateId: string,
  nowIso: string
): PersistedCheckoutRecord {
  const existing = state.checkoutByMandate[mandateId];
  if (existing) {
    return existing;
  }

  const created: PersistedCheckoutRecord = {
    state: {
      mandateId,
      status: "not-started",
      challengeCount: 0,
      paymentAttemptCount: 0,
      settledCount: 0,
      lastEventAtIso: nowIso,
    },
    events: [],
  };

  state.checkoutByMandate[mandateId] = created;
  return created;
}

function hashPaymentSignature(paymentSignature: string): string {
  return createHash("sha256").update(paymentSignature).digest("hex");
}

export function getCartMandateState(id: string): CartMandate | null {
  const filePath = resolveStatePath();
  const state = loadState(filePath);
  const mandate = state.cartMandates[id];
  return mandate ? cloneCartMandate(mandate) : null;
}

export function recordVoteState(input: { proposalId: string; fid: number; choice: VoteChoice }): VoteReceipt {
  const recordedAtIso = new Date().toISOString();

  writeMutatedState((state) => {
    ensureProposal(state, input.proposalId, recordedAtIso);

    const existingTally = state.voteTallies[input.proposalId] ?? { proposalId: input.proposalId, yes: 0, no: 0 };
    state.voteTallies[input.proposalId] = {
      ...existingTally,
      yes: input.choice === "yes" ? existingTally.yes + 1 : existingTally.yes,
      no: input.choice === "no" ? existingTally.no + 1 : existingTally.no,
    };

    state.voteEvents.push({
      id: randomUUID(),
      proposalId: input.proposalId,
      fid: input.fid,
      choice: input.choice,
      recordedAtIso,
    });

    const proposal = state.proposals[input.proposalId];
    if (proposal) {
      proposal.updatedAtIso = recordedAtIso;
    }

    state.updatedAtIso = recordedAtIso;
  });

  return {
    proposalId: input.proposalId,
    fid: input.fid,
    choice: input.choice,
    recordedAtIso,
  };
}

export function getVoteTallyState(proposalId: string): VoteTally {
  const nowIso = new Date().toISOString();
  const filePath = resolveStatePath();
  const state = loadState(filePath);

  const changed = ensureProposal(state, proposalId, nowIso);
  if (changed) {
    state.updatedAtIso = nowIso;
    persistState(filePath, state);
  }

  const tally = state.voteTallies[proposalId] ?? { proposalId, yes: 0, no: 0 };
  return cloneVoteTally(tally);
}

export function recordCheckoutPaymentRequired(input: {
  mandateId: string;
  resource: string;
  paymentRequired: X402PaymentRequired;
}): CheckoutLifecycleState {
  const occurredAtIso = new Date().toISOString();

  const state = writeMutatedState((draft) => {
    const checkout = getOrCreateCheckoutRecord(draft, input.mandateId, occurredAtIso);

    checkout.events.push({
      id: randomUUID(),
      mandateId: input.mandateId,
      type: "payment-required",
      occurredAtIso,
      resource: input.resource,
      paymentSignaturePresent: false,
      paymentRequired: { ...input.paymentRequired },
    });

    checkout.state.status = "payment-required";
    checkout.state.challengeCount += 1;
    checkout.state.lastEventAtIso = occurredAtIso;
    checkout.state.lastPaymentRequiredAtIso = occurredAtIso;

    draft.updatedAtIso = occurredAtIso;
  });

  return cloneCheckoutState(state.checkoutByMandate[input.mandateId].state);
}

export function recordCheckoutPaymentAttempt(input: {
  mandateId: string;
  resource: string;
  paymentSignature: string;
  settledAtIso: string;
}): CheckoutLifecycleState {
  const attemptAtIso = new Date().toISOString();
  const settledAtIso = toIsoTimestamp(input.settledAtIso, attemptAtIso);

  const state = writeMutatedState((draft) => {
    const checkout = getOrCreateCheckoutRecord(draft, input.mandateId, attemptAtIso);
    const paymentSignatureSha256 = hashPaymentSignature(input.paymentSignature);

    checkout.events.push({
      id: randomUUID(),
      mandateId: input.mandateId,
      type: "payment-attempted",
      occurredAtIso: attemptAtIso,
      resource: input.resource,
      paymentSignaturePresent: true,
      paymentSignatureSha256,
    });

    checkout.state.status = "payment-attempted";
    checkout.state.paymentAttemptCount += 1;
    checkout.state.lastEventAtIso = attemptAtIso;
    checkout.state.lastPaymentAttemptAtIso = attemptAtIso;

    checkout.events.push({
      id: randomUUID(),
      mandateId: input.mandateId,
      type: "payment-settled",
      occurredAtIso: settledAtIso,
      resource: input.resource,
      paymentSignaturePresent: true,
      paymentSignatureSha256,
    });

    checkout.state.status = "settled";
    checkout.state.settledCount += 1;
    checkout.state.lastEventAtIso = settledAtIso;
    checkout.state.lastSettledAtIso = settledAtIso;

    draft.updatedAtIso = settledAtIso;
  });

  return cloneCheckoutState(state.checkoutByMandate[input.mandateId].state);
}

export function getCheckoutAuditTrail(
  mandateId: string
): { state: CheckoutLifecycleState; events: CheckoutEvent[] } | null {
  const filePath = resolveStatePath();
  const state = loadState(filePath);
  const checkout = state.checkoutByMandate[mandateId];
  if (!checkout) return null;

  return {
    state: cloneCheckoutState(checkout.state),
    events: checkout.events.map(cloneCheckoutEvent),
  };
}

export function getSidlStateSnapshot(): PersistedSidlState {
  const filePath = resolveStatePath();
  const state = loadState(filePath);
  return cloneState(state);
}

export function getOperatorRegistry(): OperatorRegistry {
  const filePath = resolveStatePath();
  const state = loadState(filePath);
  return {
    operators: Object.fromEntries(
      Object.entries(state.operators).map(([id, entry]) => [id, cloneOperatorEntry(entry)])
    ),
    updatedAtIso: state.updatedAtIso,
  };
}
