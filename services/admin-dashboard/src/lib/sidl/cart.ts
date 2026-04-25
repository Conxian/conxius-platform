import type { CartMandate, X402PaymentRequired } from "./types";
import { getCartMandateState } from "./stateStore";

const DEFAULT_PAY_TO = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
const DEFAULT_USDC = "0xA0b86991C6218b36c1d19D4a2e9Eb0cE3606EB48";
const DEFAULT_NETWORK = "base-mainnet";

export function getCartMandate(id: string): CartMandate | null {
  return getCartMandateState(id);
}

export function toX402PaymentRequired(input: {
  mandate: CartMandate;
  resource: string;
}): X402PaymentRequired {
  return {
    maxAmountRequired: input.mandate.totalUsd,
    resource: input.resource,
    description: `Checkout required for: ${input.mandate.title}`,
    payTo: DEFAULT_PAY_TO,
    asset: DEFAULT_USDC,
    network: DEFAULT_NETWORK,
  };
}
