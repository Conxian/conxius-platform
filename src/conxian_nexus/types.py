"""Shared types for Conxian Nexus adapters."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class RollupType(Enum):
    CITREA = "citrea"
    STRATA = "strata"
    BABYLON = "babylon"


class NetworkMode(Enum):
    MAINNET = "mainnet"
    TESTNET = "testnet"
    DEVNET = "devnet"


class MonitorMode(Enum):
    ACTIVE = "active"
    SHADOW = "shadow"


@dataclass
class BlockData:
    number: int
    hash: str
    parent_hash: str
    timestamp: int
    transaction_count: int
    gas_used: int
    gas_limit: int
    extra_data: Optional[str] = None


@dataclass
class TransactionData:
    hash: str
    block_number: int
    from_address: str
    to_address: Optional[str]
    value: int
    gas_price: int
    gas_used: Optional[int] = None
    status: Optional[int] = None
    input_data: Optional[str] = None


@dataclass
class BridgeStatus:
    rollup_type: RollupType
    bridge_name: str
    locked_btc: int
    pending_deposits: int
    pending_withdrawals: int
    operator_count: int
    is_healthy: bool
    last_verified_proof: Optional[str] = None


@dataclass
class NetworkStatus:
    rollup_type: RollupType
    mode: NetworkMode
    chain_id: int
    latest_block: int
    peer_count: int
    is_syncing: bool
    gas_price: int
    uptime_seconds: int


@dataclass
class ShadowEvent:
    event_type: str
    rollup_type: RollupType
    block_number: int
    timestamp: int
    payload: dict = field(default_factory=dict)


@dataclass
class StakingMetrics:
    """Yield-bearing staking metrics for a protocol (Babylon, L2, etc.)."""
    protocol: str
    tvl_sats: int
    apy_bps: int
    active_stakers: int
    finality_provider_count: int
    min_stake_sats: int
    max_stake_sats: int
    is_active: bool
    updated_at_iso: str


@dataclass
class YieldSource:
    """Aggregated yield data from staking protocols for treasury allocation."""
    protocol: str
    source_type: str  # "native-staking", "liquid-staking", "l2-yield", "lending"
    tvl_sats: int
    apy_bps: int
    allocation_bps: int
    operational_unit: str
