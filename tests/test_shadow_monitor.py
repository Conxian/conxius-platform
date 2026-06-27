"""Tests for the shadow-mode monitoring layer."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from conxian_nexus.adapters.citrea import CitreaAdapter
from conxian_nexus.adapters.strata import StrataAdapter
from conxian_nexus.monitoring.shadow import ShadowMonitor
from conxian_nexus.types import BlockData, MonitorMode, NetworkMode, RollupType


@pytest.fixture
def citrea():
    return CitreaAdapter("http://localhost:8545", monitor_mode=MonitorMode.SHADOW)


@pytest.fixture
def strata():
    return StrataAdapter("http://localhost:8546", monitor_mode=MonitorMode.SHADOW)


# ------------------------------------------------------------------


def test_shadow_monitor_requires_at_least_one_adapter():
    with pytest.raises(ValueError, match="At least one adapter"):
        ShadowMonitor()


def test_shadow_monitor_accepts_multiple_adapters(citrea, strata):
    monitor = ShadowMonitor(citrea, strata)
    assert len(monitor._adapters) == 2


@pytest.mark.asyncio
async def test_stream_emits_block_events(citrea):
    block_100 = BlockData(
        number=100,
        hash="0xa",
        parent_hash="0x9",
        timestamp=1719500000,
        transaction_count=0,
        gas_used=21000,
        gas_limit=30000000,
    )
    block_101 = BlockData(
        number=101,
        hash="0xb",
        parent_hash="0xa",
        timestamp=1719500012,
        transaction_count=0,
        gas_used=21000,
        gas_limit=30000000,
    )

    mock_get_block = AsyncMock(side_effect=[block_100, block_101, block_101])
    mock_get_txs = AsyncMock(return_value=[])

    with (
        patch.object(citrea, "get_block", mock_get_block),
        patch.object(citrea, "get_transactions_by_block", mock_get_txs),
    ):
        monitor = ShadowMonitor(citrea, poll_interval=0.01)
        await monitor.start()

        events = []
        async for event in monitor.stream_blocks():
            events.append(event)
            if len(events) >= 2:
                break

        await monitor.stop()

    assert len(events) == 2
    assert events[0].event_type == "new_block"
    assert events[0].block_number == 100
    assert events[1].event_type == "new_block"
    assert events[1].block_number == 101


@pytest.mark.asyncio
async def test_duplicate_blocks_are_deduplicated(citrea):
    block = BlockData(
        number=42,
        hash="0x42",
        parent_hash="0x41",
        timestamp=1719500000,
        transaction_count=0,
        gas_used=0,
        gas_limit=0,
    )
    mock_get_block = AsyncMock(return_value=block)
    mock_get_txs = AsyncMock(return_value=[])

    with (
        patch.object(citrea, "get_block", mock_get_block),
        patch.object(citrea, "get_transactions_by_block", mock_get_txs),
    ):
        monitor = ShadowMonitor(citrea, poll_interval=0.01)
        await monitor.start()

        events = []
        async for event in monitor.stream_blocks():
            events.append(event)
            if len(events) >= 1:
                await asyncio.sleep(0.05)  # let a second poll happen
                break

        await monitor.stop()

    # Only one event, even though the mock returned the same block multiple times
    block_events = [e for e in events if e.event_type == "new_block"]
    assert len(block_events) == 1
    assert block_events[0].block_number == 42


@pytest.mark.asyncio
async def test_status_snapshot(citrea):
    from conxian_nexus.types import BridgeStatus, NetworkStatus

    mock_network = AsyncMock(
        return_value=NetworkStatus(
            rollup_type=RollupType.CITREA,
            mode=NetworkMode.TESTNET,
            chain_id=5115,
            latest_block=100,
            peer_count=8,
            is_syncing=False,
            gas_price=20_000_000_000,
            uptime_seconds=0,
        )
    )
    mock_bridge = AsyncMock(
        return_value=BridgeStatus(
            rollup_type=RollupType.CITREA,
            bridge_name="Clementine",
            locked_btc=0,
            pending_deposits=0,
            pending_withdrawals=0,
            operator_count=15,
            is_healthy=False,
        )
    )

    with (
        patch.object(citrea, "get_network_status", mock_network),
        patch.object(citrea, "get_bridge_status", mock_bridge),
    ):
        monitor = ShadowMonitor(citrea)
        await monitor.start()
        snap = await monitor.get_status_snapshot()
        await monitor.stop()

    assert RollupType.CITREA in snap
    assert snap[RollupType.CITREA]["network"].latest_block == 100
    assert snap[RollupType.CITREA]["bridge"].bridge_name == "Clementine"


@pytest.mark.asyncio
async def test_multiple_adapter_monitoring(citrea, strata):
    block = BlockData(
        number=1, hash="0x1", parent_hash="0x0",
        timestamp=1, transaction_count=0, gas_used=0, gas_limit=0,
    )
    mock_block = AsyncMock(return_value=block)
    mock_txs = AsyncMock(return_value=[])

    with (
        patch.object(citrea, "get_block", mock_block),
        patch.object(citrea, "get_transactions_by_block", mock_txs),
        patch.object(strata, "get_block", mock_block),
        patch.object(strata, "get_transactions_by_block", mock_txs),
    ):
        monitor = ShadowMonitor(citrea, strata, poll_interval=0.01)
        await monitor.start()

        events = []
        async for event in monitor.stream_blocks():
            events.append(event)
            if len(events) >= 2:
                break

        await monitor.stop()

    rollups_seen = {e.rollup_type for e in events}
    assert RollupType.CITREA in rollups_seen
    assert RollupType.STRATA in rollups_seen
