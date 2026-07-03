"""Strata T1 Adapter — EVM-compatible ZK-rollup on Bitcoin with privacy.

Strata is a validity rollup anchored to Bitcoin that adds privacy-preserving
execution alongside full EVM compatibility. Its bridging mechanism uses
optimistic-ZK verification to keep the L1 trust assumption at one honest
participant.
"""

from __future__ import annotations

import logging

from conxian_nexus.adapters._evm_base import _EVMAdapterBase
from conxian_nexus.types import NetworkMode, RollupType

logger = logging.getLogger(__name__)

_STRATA_CHAIN_IDS: dict[NetworkMode, int] = {
    NetworkMode.MAINNET: 2952,
    NetworkMode.TESTNET: 5116,
    NetworkMode.DEVNET: 2953,
}

_STRATA_DEFAULTS: dict[str, int | str] = {
    "getOperatorCount": 8,
    "getTotalLockedBTC": 0,
    "getPendingDepositCount": 0,
    "getPendingWithdrawalCount": 0,
    "getLastVerifiedProof": "",
}


class StrataAdapter(_EVMAdapterBase):
    """Adapter for the Strata validity rollup.

    Parameters
    ----------
    rpc_url:
        HTTP(S) JSON-RPC endpoint for the Strata sequencer.
    mode:
        Network flavour; drives default chain-id selection.
    monitor_mode:
        ``SHADOW`` (default) for read-only observation,
        ``ACTIVE`` if the adapter is allowed to submit transactions.
    """

    rollup_type = RollupType.STRATA
    bridge_name = "Strata Bridge"
    _CHAIN_IDS = _STRATA_CHAIN_IDS

    async def _call(self, method: str) -> int | str:
        return _STRATA_DEFAULTS.get(method, 0)

    def _bridge_healthy(self, operator_count: int, locked: int) -> bool:
        """Strata bridge is healthy as long as operators are online."""
        return operator_count > 0
