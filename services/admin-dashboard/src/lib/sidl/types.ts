export type FarcasterFrameActionPayload = {
  untrustedData: {
    fid: number;
    url: string;
    messageHash: string;
    timestamp: number;
    network: number;
    buttonIndex: number;
    inputText?: string;
    state?: string;
    castId: {
      fid: number;
      hash: string;
    };
  };
  trustedData?: {
    messageBytes: string;
  };
};

export type YieldSnapshot = {
  token: "sBTC";
  apy: number | null;
  updatedAtIso: string;
};

export type VoteChoice = "yes" | "no";

export type VoteReceipt = {
  proposalId: string;
  fid: number;
  choice: VoteChoice;
  recordedAtIso: string;
};

export type VoteTally = {
  proposalId: string;
  yes: number;
  no: number;
};

export type SidlProposal = {
  id: string;
  title: string;
  description?: string;
  status: "open" | "closed";
  createdAtIso: string;
  updatedAtIso: string;
};

export type VoteEvent = {
  id: string;
  proposalId: string;
  fid: number;
  choice: VoteChoice;
  recordedAtIso: string;
};

export type CartItem = {
  sku: string;
  name: string;
  quantity: number;
  unitUsd: string;
};

export type CartMandate = {
  id: string;
  title: string;
  items: CartItem[];
  totalUsd: string;
  createdAtIso: string;
};

export type X402PaymentRequired = {
  maxAmountRequired: string;
  resource: string;
  description?: string;
  payTo: string;
  asset: string;
  network: string;
};

export type CheckoutEventType = "payment-required" | "payment-attempted" | "payment-settled";

export type CheckoutEvent = {
  id: string;
  mandateId: string;
  type: CheckoutEventType;
  occurredAtIso: string;
  resource: string;
  paymentSignaturePresent: boolean;
  paymentSignatureSha256?: string;
  paymentRequired?: X402PaymentRequired;
};

export type CheckoutLifecycleState = {
  mandateId: string;
  status: "not-started" | "payment-required" | "payment-attempted" | "settled";
  challengeCount: number;
  paymentAttemptCount: number;
  settledCount: number;
  lastEventAtIso: string;
  lastPaymentRequiredAtIso?: string;
  lastPaymentAttemptAtIso?: string;
  lastSettledAtIso?: string;
};

export type ErpTreasuryAsset = {
  id: string;
  ticker: string;
  balance: string;
};

export type ErpEmployee = {
  id: string;
  name: string;
  ubi_id: string;
  base_salary_btc: string;
};

export type ErpInvoice = {
  id: string;
  customer_name: string;
  amount_btc: string;
  status: string;
  created_at: string;
};

export type ErpAiComputeLog = {
  id: string;
  agent_id: string;
  tokens_allocated: string;
  timestamp: string;
};

export type ErpDashboardData = {
  treasury: ErpTreasuryAsset[];
  employees: ErpEmployee[];
  invoices: ErpInvoice[];
  computeLogs: ErpAiComputeLog[];
};

export type CrossChainEvent = {
  id: string;
  source_chain: string;
  destination_chain: string;
  event_type: string;
  payload: any;
  sequence_number: number;
  nexus_id: string;
  nexus_signature: string;
  occurred_at_iso: string;
};

export type EventDeliveryStatus = "pending" | "delivered" | "failed" | "retrying";

export type EventDeliveryRecord = {
  event_id: string;
  status: EventDeliveryStatus;
  retry_count: number;
  last_attempt_at_iso?: string;
  error?: string;
};

export type EventBusState = {
  last_sequence_processed: number;
  delivery_records: Record<string, EventDeliveryRecord>;
};
