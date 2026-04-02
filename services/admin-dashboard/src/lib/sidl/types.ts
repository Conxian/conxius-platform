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
