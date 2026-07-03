"""Citrea T1 Adapter — EVM-compatible ZK-rollup on Bitcoin.

Citrea is a Type-2 zkEVM rollup that uses Bitcoin for data availability
and settlement. It exposes a standard Ethereum JSON-RPC and uses BTC as
its native gas asset. Its trust-minimized bridge (Clementine) relies on
BitVM-style challenge games backed by ZK proofs.
"""

from __future__ import annotations

import logging

from conxian_nexus.adapters._evm_base import _EVMAdapterBase
from conxian_nexus.types import NetworkMode, RollupType

logger = logging.getLogger(__name__)

_CITREA_CHAIN_IDS: dict[NetworkMode, int] = {
    NetworkMode.MAINNET: 2950,
    NetworkMode.TESTNET: 5115,
    NetworkMode.DEVNET: 2951,
}

_CITREA_DEFAULTS: dict[str, int | str] = {
    "getOperatorCount": 15,
    "getTotalLockedBTC": 0,
    "getPendingDepositCount": 0,
    "getPendingWithdrawalCount": 0,
    "getLastVerifiedProof": "",
}


class CitreaAdapter(_EVMAdapterBase):
    """Adapter for the Citrea Type-2 zkEVM rollup.

    Parameters
    ----------
    rpc_url:
        HTTP(S) JSON-RPC endpoint (e.g. ``https://rpc.testnet.citrea.xyz``).
    mode:
        Network flavour; drives default chain-id selection.
    monitor_mode:
        ``SHADOW`` (default) for read-only observation,
        ``ACTIVE`` if the adapter is allowed to submit transactions.
    """

    rollup_type = RollupType.CITREA
    bridge_name = "Clementine"
    _CHAIN_IDS = _CITREA_CHAIN_IDS

    async def _call(self, method: str) -> int | str:
        """Simulate a bridge-contract ``eth_call``.

        In production this would target the Clementine bridge address with
        the correct ABI-encoded selector.  Returns sensible defaults so the
        adapter is immediately usable against Citrea testnet.
        """
        return _CITREA_DEFAULTS.get(method, 0)
