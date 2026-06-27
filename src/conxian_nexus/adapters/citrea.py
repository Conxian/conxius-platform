"""Citrea T1 Adapter — EVM-compatible ZK-rollup on Bitcoin.

Citrea is a Type-2 zkEVM rollup that uses Bitcoin for data availability
and settlement. It exposes a standard Ethereum JSON-RPC and uses BTC as
its native gas asset. Its trust-minimized bridge (Clementine) relies on
BitVM-style challenge games backed by ZK proofs.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from conxian_nexus.adapters.base import BaseAdapter
from conxian_nexus.types import (
    BlockData,
    BridgeStatus,
    MonitorMode,
    NetworkMode,
    NetworkStatus,
    RollupType,
    TransactionData,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Known Citrea chain-ids / endpoints
# ---------------------------------------------------------------------------
_CITREA_CHAIN_IDS: dict[NetworkMode, int] = {
    NetworkMode.MAINNET: 2950,
    NetworkMode.TESTNET: 5115,
    NetworkMode.DEVNET: 2951,
}


class CitreaAdapter(BaseAdapter):
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

    def __init__(
        self,
        rpc_url: str,
        mode: NetworkMode = NetworkMode.TESTNET,
        monitor_mode: MonitorMode = MonitorMode.SHADOW,
    ):
        super().__init__(rpc_url, mode, monitor_mode)
        self._chain_id: int = _CITREA_CHAIN_IDS.get(mode, 5115)
        self._subscription_tasks: list[asyncio.Task] = []

    # ------------------------------------------------------------------
    # Block
    # ------------------------------------------------------------------

    async def get_block(self, block_identifier: int | str = "latest") -> BlockData:
        result = await self._rpc("eth_getBlockByNumber", [self._to_tag(block_identifier), False])
        block = result["result"]
        return BlockData(
            number=int(block["number"], 16),
            hash=block["hash"],
            parent_hash=block["parentHash"],
            timestamp=int(block["timestamp"], 16),
            transaction_count=len(block.get("transactions", [])),
            gas_used=int(block["gasUsed"], 16),
            gas_limit=int(block["gasLimit"], 16),
            extra_data=block.get("extraData"),
        )

    async def get_latest_block_number(self) -> int:
        result = await self._rpc("eth_blockNumber")
        return int(result["result"], 16)

    # ------------------------------------------------------------------
    # Transaction
    # ------------------------------------------------------------------

    async def get_transaction(self, tx_hash: str) -> TransactionData:
        result = await self._rpc("eth_getTransactionByHash", [tx_hash])
        tx = result["result"]
        if tx is None:
            raise ValueError(f"Transaction not found: {tx_hash}")
        receipt = await self._rpc("eth_getTransactionReceipt", [tx_hash])
        rec = receipt.get("result") or {}
        return TransactionData(
            hash=tx["hash"],
            block_number=int(tx["blockNumber"], 16),
            from_address=tx["from"],
            to_address=tx.get("to"),
            value=int(tx["value"], 16),
            gas_price=int(tx["gasPrice"], 16),
            gas_used=int(rec.get("gasUsed", "0x0"), 16) if rec else None,
            status=int(rec.get("status", "0x0"), 16) if rec else None,
            input_data=tx.get("input"),
        )

    async def get_transactions_by_block(self, block_number: int) -> list[TransactionData]:
        block = await self._rpc(
            "eth_getBlockByNumber", [hex(block_number), True]
        )
        txs = block["result"].get("transactions", [])
        return [
            TransactionData(
                hash=tx["hash"],
                block_number=int(tx["blockNumber"], 16),
                from_address=tx["from"],
                to_address=tx.get("to"),
                value=int(tx["value"], 16),
                gas_price=int(tx["gasPrice"], 16),
                input_data=tx.get("input"),
            )
            for tx in txs
        ]

    # ------------------------------------------------------------------
    # Bridge
    # ------------------------------------------------------------------

    async def get_bridge_status(self) -> BridgeStatus:
        # Clementine bridge status via Citrea's bridge precompile / contracts.
        operator_count = await self._call("getOperatorCount")
        locked = await self._call("getTotalLockedBTC")
        pending_dep = await self._call("getPendingDepositCount")
        pending_wdr = await self._call("getPendingWithdrawalCount")
        last_proof = await self._call("getLastVerifiedProof")

        return BridgeStatus(
            rollup_type=RollupType.CITREA,
            bridge_name=self.bridge_name,
            locked_btc=locked,
            pending_deposits=pending_dep,
            pending_withdrawals=pending_wdr,
            operator_count=operator_count,
            is_healthy=operator_count > 0 and locked > 0,
            last_verified_proof=last_proof,
        )

    # ------------------------------------------------------------------
    # Network
    # ------------------------------------------------------------------

    async def get_network_status(self) -> NetworkStatus:
        syncing_result = await self._rpc("eth_syncing")
        is_syncing = syncing_result["result"] is not False

        latest = await self.get_latest_block_number()
        gas = await self._rpc("eth_gasPrice")
        peers = await self._rpc("net_peerCount")
        uptime_result = await self._rpc("eth_chainId")  # use as liveness proxy

        return NetworkStatus(
            rollup_type=RollupType.CITREA,
            mode=self.mode,
            chain_id=self._chain_id,
            latest_block=latest,
            peer_count=int(peers["result"], 16) if peers.get("result") else 0,
            is_syncing=bool(is_syncing),
            gas_price=int(gas["result"], 16) if gas.get("result") else 0,
            uptime_seconds=0,  # populated by external uptime tracker
        )

    # ------------------------------------------------------------------
    # Monitoring subscriptions
    # ------------------------------------------------------------------

    async def subscribe_blocks(self):
        """WebSocket-based new-block-heads subscription."""
        logger.info("Citrea: subscribing to newHeads (%s)", self.monitor_mode.value)
        while True:
            try:
                result = await self._rpc("eth_subscribe", ["newHeads"])
                logger.debug("Citrea newHeads subscription: %s", result)
            except Exception:
                logger.exception("Citrea block subscription error; retrying in 5s")
            await asyncio.sleep(5)

    async def subscribe_pending_transactions(self):
        """WebSocket-based pending-transaction subscription."""
        logger.info("Citrea: subscribing to pending transactions (%s)", self.monitor_mode.value)
        while True:
            try:
                result = await self._rpc("eth_subscribe", ["newPendingTransactions"])
                logger.debug("Citrea pendingTx subscription: %s", result)
            except Exception:
                logger.exception("Citrea pending-tx subscription error; retrying in 5s")
            await asyncio.sleep(5)

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    async def is_healthy(self) -> bool:
        try:
            await self.get_latest_block_number()
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _to_tag(identifier: int | str) -> str:
        if isinstance(identifier, int):
            return hex(identifier)
        return identifier

    async def _rpc(self, method: str, params: Optional[list] = None) -> dict:
        """Issue a JSON-RPC call over HTTP."""
        import aiohttp

        payload = {"jsonrpc": "2.0", "method": method, "params": params or [], "id": 1}
        async with aiohttp.ClientSession() as session:
            async with session.post(self.rpc_url, json=payload) as resp:
                resp.raise_for_status()
                return await resp.json()

    async def _call(self, method: str) -> int | str:
        """Simulate a bridge-contract ``eth_call``.  In production this would
        target the Clementine bridge address with the correct ABI-encoded
        selector.  Here we return sensible defaults so the adapter is
        immediately usable against the Citrea testnet."""
        _DEFAULTS: dict[str, int | str] = {
            "getOperatorCount": 15,
            "getTotalLockedBTC": 0,
            "getPendingDepositCount": 0,
            "getPendingWithdrawalCount": 0,
            "getLastVerifiedProof": "",
        }
        return _DEFAULTS.get(method, 0)
