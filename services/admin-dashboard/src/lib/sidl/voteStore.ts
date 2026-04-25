import type { VoteChoice, VoteReceipt, VoteTally } from "./types";
import { getVoteTallyState, recordVoteState } from "./stateStore";

export function recordVote(input: { proposalId: string; fid: number; choice: VoteChoice }): VoteReceipt {
  return recordVoteState(input);
}

export function getVoteTally(proposalId: string): VoteTally {
  return getVoteTallyState(proposalId);
}
