import type { Action, ProviderValue } from "@elizaos/core";
import type { JsonValue } from "@elizaos/core";
import {
  checkoutCartX402,
  getCartMandate,
  getGatewayStatus,
  getSbtcYield,
  getAiAllocation,
  getUbiIdentity,
  submitVote,
} from "./conxianClient";
import type { ConxianPluginEnv } from "./conxianClient";

function parameters(options?: unknown): Record<string, JsonValue | undefined> {
  if (!options || typeof options !== "object") return {};
  const o = options as Record<string, unknown>;
  const p = o.parameters;
  if (!p || typeof p !== "object") return {};
  return p as Record<string, JsonValue | undefined>;
}

function toProviderValue(value: unknown): ProviderValue {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value;
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return value.map((v) => toProviderValue(v));
  if (typeof value === "object") return value;
  return String(value);
}

export function createConxianActions(env: ConxianPluginEnv): Action[] {
  return [
    {
      name: "CONXIAN_GATEWAY_STATUS",
      description: "Fetch Conxian Gateway status (/api/v1/status).",
      validate: async () => true,
      handler: async (_runtime, _message, _state, options, callback) => {
        const data = await getGatewayStatus(env);
        const text = JSON.stringify(data, null, 2);
        if (callback) await callback({ text });
        return { success: true, text, data: { response: toProviderValue(data) } };
      },
      similes: ["GATEWAY_STATUS", "CONXIAN_STATUS"],
    },
    {
      name: "CONXIAN_SBTC_YIELD",
      description: "Fetch sBTC yield snapshot (via Gateway /api/v1/lorenzo/stats).",
      validate: async () => true,
      handler: async (_runtime, _message, _state, _options, callback) => {
        const data = await getSbtcYield(env);
        const text = JSON.stringify(data, null, 2);
        if (callback) await callback({ text });
        return { success: true, text, data: { response: toProviderValue(data) } };
      },
      similes: ["SBTC_YIELD", "YIELD_SBTC"],
    },
    {
      name: "CONXIAN_AI_ALLOCATION",
      description: "Fetch AI-optimized asset weights for a profile (aggressive|conservative|balanced).",
      validate: async () => true,
      parameters: [
        {
          name: "profile",
          description: "Portfolio profile",
          required: true,
          schema: { type: "string" },
        },
      ],
      handler: async (_runtime, _message, _state, options, callback) => {
        const p = parameters(options);
        const profile = typeof p.profile === "string" ? p.profile : "balanced";
        const data = await getAiAllocation(env, profile);
        const text = JSON.stringify(data, null, 2);
        if (callback) await callback({ text });
        return { success: true, text, data: { response: toProviderValue(data) } };
      },
      similes: ["AI_ALLOCATION", "PORTFOLIO_WEIGHTS"],
    },
    {
      name: "CONXIAN_UBI_IDENTITY",
      description: "Fetch UBI identity details for a Bitcoin address or DID.",
      validate: async () => true,
      parameters: [
        {
          name: "id",
          description: "Address or UBI ID",
          required: true,
          schema: { type: "string" },
        },
      ],
      handler: async (_runtime, _message, _state, options, callback) => {
        const p = parameters(options);
        const id = typeof p.id === "string" ? p.id : "";
        if (!id) return { success: false, error: "missing-parameter:id" };
        const data = await getUbiIdentity(env, id);
        const text = JSON.stringify(data, null, 2);
        if (callback) await callback({ text });
        return { success: true, text, data: { response: toProviderValue(data) } };
      },
      similes: ["UBI_IDENTITY", "SOVEREIGN_ID"],
    },
    {
      name: "CONXIAN_GET_CART_MANDATE",
      description: "Fetch an x402 Cart Mandate by ID from the SIDL social surface.",
      validate: async () => true,
      parameters: [
        {
          name: "id",
          description: "Cart Mandate ID (example: sbtc-yield-frame)",
          required: true,
          schema: { type: "string" },
        },
      ],
      handler: async (_runtime, _message, _state, options, callback) => {
        const p = parameters(options);
        const id = typeof p.id === "string" ? p.id : "";
        if (!id) return { success: false, error: "missing-parameter:id" };

        const data = await getCartMandate(env, id);
        const text = JSON.stringify(data, null, 2);
        if (callback) await callback({ text });
        return { success: true, text, data: { response: toProviderValue(data) } };
      },
      similes: ["GET_CART_MANDATE"],
    },
    {
      name: "CONXIAN_X402_CHECKOUT_CART",
      description: "Attempt x402 checkout for a Cart Mandate (returns 402 + PAYMENT-REQUIRED when payment is missing).",
      validate: async () => true,
      parameters: [
        {
          name: "id",
          description: "Cart Mandate ID",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "paymentSignature",
          description: "Optional PAYMENT-SIGNATURE header value (opaque for local testing)",
          required: false,
          schema: { type: "string" },
        },
      ],
      handler: async (_runtime, _message, _state, options, callback) => {
        const p = parameters(options);
        const id = typeof p.id === "string" ? p.id : "";
        const paymentSignature = typeof p.paymentSignature === "string" ? p.paymentSignature : undefined;
        if (!id) return { success: false, error: "missing-parameter:id" };

        const res = await checkoutCartX402(env, { id, paymentSignature });
        const text = JSON.stringify(res, null, 2);
        if (callback) await callback({ text });
        return {
          success: true,
          text,
          data: {
            status: res.status,
            paymentRequired: toProviderValue(res.paymentRequired),
            body: toProviderValue(res.body),
          },
        };
      },
      similes: ["X402_CHECKOUT", "CHECKOUT_CART"],
    },
    {
      name: "CONXIAN_SUBMIT_VOTE",
      description: "Submit a governance vote (reference implementation) to the SIDL social surface.",
      validate: async () => true,
      parameters: [
        {
          name: "proposalId",
          description: "Proposal ID",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "fid",
          description: "Farcaster fid (numeric)",
          required: true,
          schema: { type: "number" },
        },
        {
          name: "choice",
          description: "Vote choice (yes|no)",
          required: true,
          schema: { type: "string", enum: ["yes", "no"] },
        },
      ],
      handler: async (_runtime, _message, _state, options, callback) => {
        const p = parameters(options);

        const proposalId = typeof p.proposalId === "string" ? p.proposalId : "";
        const fid = typeof p.fid === "number" ? p.fid : NaN;
        const choice = p.choice === "yes" || p.choice === "no" ? p.choice : null;

        if (!proposalId) return { success: false, error: "missing-parameter:proposalId" };
        if (!Number.isFinite(fid)) return { success: false, error: "missing-parameter:fid" };
        if (!choice) return { success: false, error: "missing-parameter:choice" };

        const data = await submitVote(env, { proposalId, fid, choice });
        const text = JSON.stringify(data, null, 2);
        if (callback) await callback({ text });
        return { success: true, text, data: { response: toProviderValue(data) } };
      },
      similes: ["SUBMIT_VOTE", "VOTE"],
    },
  ];
}
