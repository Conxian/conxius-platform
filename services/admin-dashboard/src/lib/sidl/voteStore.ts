import type { VoteChoice, VoteReceipt, VoteTally } from "./types";

type VoteStoreState = {
  tallies: Map<string, { yes: number; no: number }>;
};

const globalKey = "__conxianSidlVoteStore" as const;

function getGlobalState(): VoteStoreState {
  const g = globalThis as unknown as Record<string, unknown>;

  const existing = g[globalKey];
  if (existing && typeof existing === "object" && "tallies" in (existing as Record<string, unknown>)) {
    return existing as VoteStoreState;
  }

  const state: VoteStoreState = { tallies: new Map() };
  g[globalKey] = state;
  return state;
}

export function recordVote(input: { proposalId: string; fid: number; choice: VoteChoice }): VoteReceipt {
  const state = getGlobalState();
  const prev = state.tallies.get(input.proposalId) ?? { yes: 0, no: 0 };

  const next =
    input.choice === "yes"
      ? { yes: prev.yes + 1, no: prev.no }
      : { yes: prev.yes, no: prev.no + 1 };

  state.tallies.set(input.proposalId, next);

  return {
    proposalId: input.proposalId,
    fid: input.fid,
    choice: input.choice,
    recordedAtIso: new Date().toISOString(),
  };
}

export function getVoteTally(proposalId: string): VoteTally {
  const state = getGlobalState();
  const t = state.tallies.get(proposalId) ?? { yes: 0, no: 0 };
  return { proposalId, yes: t.yes, no: t.no };
}
