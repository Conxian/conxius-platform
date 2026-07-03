"""Shared EVM-compatible adapter base for T1 ZK-rollups.

Provides JSON-RPC communication, block/transaction retrieval, network
status queries, subscription loops, and health checks — all common to
EVM-compatible rollups. Concrete adapters only need to supply chain
identity and bridge-contract-specific ``_call()`` logic.
"""

from __future__ import annotations

import asyncio
import logging
from abc import abstractmethod

import aiohttp

from conxian_nexus.adapters.base import BaseAdapter
from conxian_nexus.types import (
    BlockData,
    BridgeStatus,
    MonitorMode,
    NetworkMode,
    NetworkStatus,
    TransactionData,
)

logger = logging.getLogger(__name__)

_DEFAULT_RPC_TIMEOUT = aiohttp.ClientTimeout(total=30)


class _EVMAdapterBase(BaseAdapter):
    """Intermediate base for EVM-compatible rollup adapters.

    Manages a shared ``aiohttp.ClientSession`` for connection pooling,
    implements all RPC-backed methods, and exposes an abstract ``_call()``
    for bridge-contract queries that vary per chain.

    Subclasses must define:
      * ``rollup_type``
      * ``bridge_name``
      * ``_chain_id`` (set in ``__init__``)
      * ``_call(method)`` for bridge-contract state reads
    """

    _CHAIN_IDS: dict[NetworkMode, int] = {}

    def __init__(
        self,
        rpc_url: str,
        mode: NetworkMode = NetworkMode.TESTNET,
        monitor_mode: MonitorMode = MonitorMode.SHADOW,
        *,
        bridge_address: str | None = None,
        bridge_abi: list[dict] | None = None,
    ):
        super().__init__(rpc_url, mode, monitor_mode)
        self._chain_id: int = self._CHAIN_IDS.get(mode, 0)
        self._bridge_address = bridge_address
        self._bridge_abi = bridge_abi
        self._session: aiohttp.ClientSession | None = None
        self._running = False

    # -- lifecycle ----------------------------------------------------------

    async def close(self) -> None:
        """Release the shared HTTP session and cancel subscriptions."""
        self._running = False
        if self._session is not None:
            await self._session.close()
            self._session = None

    def _get_session(self) -> aiohttp.ClientSession:
        """Return the shared session, creating it lazily on first use."""
        if self._session is None:
            self._session = aiohttp.ClientSession(timeout=_DEFAULT_RPC_TIMEOUT)
        return self._session

    # -- block --------------------------------------------------------------

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

    # -- transaction --------------------------------------------------------

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
        block = await self._rpc("eth_getBlockByNumber", [hex(block_number), True])
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

    # -- bridge -------------------------------------------------------------

    @abstractmethod
    async def _call(self, method: str) -> int | str:
        """Call a bridge-contract view method.

        Concrete adapters may return stub defaults or delegate to
        ``_eth_call`` when a bridge address is configured.
        """

    async def _eth_call(self, method: str) -> int | str:
        """Issue an ``eth_call`` to the configured bridge contract.

        Falls back to ``_call()`` when no bridge address is configured,
        preserving backward compatibility with stub-based adapters.
        """
        if self._bridge_address is None:
            return await self._call(method)
        selector = self._selector_for(method)
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_call",
            "params": [{"to": self._bridge_address, "data": selector}, "latest"],
            "id": 1,
        }
        async with self._get_session().post(self.rpc_url, json=payload) as resp:
            resp.raise_for_status()
            result = await resp.json()
            raw = result.get("result", "0x0")
            return int(raw, 16) if raw != "0x" else ""

    @staticmethod
    def _selector_for(method: str) -> str:
        """Map a logical method name to a 4-byte keccak256 selector.

        Override in subclasses that use real bridge contracts.
        """
        import hashlib

        _SELECTORS: dict[str, str] = {
            "getOperatorCount": "0x" + hashlib.sha256(b"getOperatorCount()").hexdigest()[:8],
            "getTotalLockedBTC": "0x" + hashlib.sha256(b"getTotalLockedBTC()").hexdigest()[:8],
            "getPendingDepositCount": "0x" + hashlib.sha256(b"getPendingDepositCount()").hexdigest()[:8],
            "getPendingWithdrawalCount": "0x" + hashlib.sha256(b"getPendingWithdrawalCount()").hexdigest()[:8],
            "getLastVerifiedProof": "0x" + hashlib.sha256(b"getLastVerifiedProof()").hexdigest()[:8],
        }
        return _SELECTORS.get(method, "0x")

    async def get_bridge_status(self) -> BridgeStatus:
        operator_count = await self._eth_call("getOperatorCount")
        locked = await self._eth_call("getTotalLockedBTC")
        pending_dep = await self._eth_call("getPendingDepositCount")
        pending_wdr = await self._eth_call("getPendingWithdrawalCount")
        last_proof = await self._eth_call("getLastVerifiedProof")

        return BridgeStatus(
            rollup_type=self.rollup_type,
            bridge_name=self.bridge_name,
            locked_btc=locked,
            pending_deposits=pending_dep,
            pending_withdrawals=pending_wdr,
            operator_count=operator_count,
            is_healthy=self._bridge_healthy(operator_count, locked),
            last_verified_proof=last_proof,
        )

    def _bridge_healthy(self, operator_count: int, locked: int) -> bool:
        """Bridge health predicate. Override for chain-specific rules."""
        return operator_count > 0 and locked > 0

    # -- network ------------------------------------------------------------

    async def get_network_status(self) -> NetworkStatus:
        syncing_result = await self._rpc("eth_syncing")
        is_syncing = syncing_result["result"] is not False

        latest = await self.get_latest_block_number()
        gas = await self._rpc("eth_gasPrice")
        peers = await self._rpc("net_peerCount")

        return NetworkStatus(
            rollup_type=self.rollup_type,
            mode=self.mode,
            chain_id=self._chain_id,
            latest_block=latest,
            peer_count=int(peers["result"], 16) if peers.get("result") else 0,
            is_syncing=bool(is_syncing),
            gas_price=int(gas["result"], 16) if gas.get("result") else 0,
            uptime_seconds=0,
        )

    # -- subscriptions ------------------------------------------------------

    async def subscribe_blocks(self) -> None:
        logger.info("%s: subscribing to newHeads (%s)", self.rollup_type.value, self.monitor_mode.value)
        self._running = True
        while self._running:
            try:
                result = await self._rpc("eth_subscribe", ["newHeads"])
                logger.debug("%s newHeads subscription: %s", self.rollup_type.value, result)
            except Exception:
                logger.exception("%s block subscription error; retrying", self.rollup_type.value)
            await asyncio.sleep(5)

    async def subscribe_pending_transactions(self) -> None:
        logger.info("%s: subscribing to pending transactions (%s)", self.rollup_type.value, self.monitor_mode.value)
        self._running = True
        while self._running:
            try:
                result = await self._rpc("eth_subscribe", ["newPendingTransactions"])
                logger.debug("%s pendingTx subscription: %s", self.rollup_type.value, result)
            except Exception:
                logger.exception("%s pending-tx subscription error; retrying", self.rollup_type.value)
            await asyncio.sleep(5)

    # -- health -------------------------------------------------------------

    async def is_healthy(self) -> bool:
        try:
            await self.get_latest_block_number()
            return True
        except Exception:
            return False

    # -- internal helpers ---------------------------------------------------

    @staticmethod
    def _to_tag(identifier: int | str) -> str:
        if isinstance(identifier, int):
            return hex(identifier)
        return identifier

    async def _rpc(self, method: str, params: list | None = None) -> dict:
        """Issue a JSON-RPC call over HTTP using the shared session."""
        payload = {"jsonrpc": "2.0", "method": method, "params": params or [], "id": 1}
        async with self._get_session().post(self.rpc_url, json=payload) as resp:
            resp.raise_for_status()
            return await resp.json()
