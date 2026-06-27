"""Base adapter interface for T1 rollup protocols."""

from abc import ABC, abstractmethod
from typing import Optional

from conxian_nexus.types import (
    BlockData,
    BridgeStatus,
    MonitorMode,
    NetworkMode,
    NetworkStatus,
    RollupType,
    TransactionData,
)


class BaseAdapter(ABC):
    """Abstract base for all T1 rollup protocol adapters.

    Each adapter wraps a specific rollup's RPC and provides a uniform
    interface for block retrieval, transaction inspection, bridge-status
    queries, and network-health checks.
    """

    def __init__(
        self,
        rpc_url: str,
        mode: NetworkMode = NetworkMode.TESTNET,
        monitor_mode: MonitorMode = MonitorMode.SHADOW,
    ):
        self.rpc_url = rpc_url
        self.mode = mode
        self.monitor_mode = monitor_mode

    @property
    @abstractmethod
    def rollup_type(self) -> RollupType:
        """Return the rollup variant this adapter targets."""

    @property
    @abstractmethod
    def bridge_name(self) -> str:
        """Human-readable name of the native bridge."""

    # -- Block ------------------------------------------------------------------

    @abstractmethod
    async def get_block(self, block_identifier: int | str = "latest") -> BlockData:
        """Fetch a single block by number or tag (``latest``, ``pending``)."""

    @abstractmethod
    async def get_latest_block_number(self) -> int:
        """Return the height of the latest confirmed block."""

    # -- Transaction ------------------------------------------------------------

    @abstractmethod
    async def get_transaction(self, tx_hash: str) -> TransactionData:
        """Fetch a transaction by its hash."""

    @abstractmethod
    async def get_transactions_by_block(self, block_number: int) -> list[TransactionData]:
        """Return every transaction included in the given block."""

    # -- Bridge -----------------------------------------------------------------

    @abstractmethod
    async def get_bridge_status(self) -> BridgeStatus:
        """Query the native bridge for liveness, locked BTC, and pending ops."""

    # -- Network ----------------------------------------------------------------

    @abstractmethod
    async def get_network_status(self) -> NetworkStatus:
        """Return chain-level metrics (syncing, gas, peers, uptime)."""

    # -- Monitoring -------------------------------------------------------------

    @abstractmethod
    async def subscribe_blocks(self):
        """Start a persistent block-head subscription (shadow-mode safe)."""

    @abstractmethod
    async def subscribe_pending_transactions(self):
        """Start a persistent pending-tx subscription (shadow-mode safe)."""

    # -- Utilities --------------------------------------------------------------

    @abstractmethod
    async def is_healthy(self) -> bool:
        """Lightweight liveness check."""
