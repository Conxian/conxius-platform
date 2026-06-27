"""Tests for the Strata adapter."""

from unittest.mock import AsyncMock, patch

import pytest

from conxian_nexus.adapters.strata import StrataAdapter
from conxian_nexus.types import MonitorMode, NetworkMode, RollupType


@pytest.fixture
def adapter():
    return StrataAdapter(
        rpc_url="https://rpc.testnet.strata.xyz",
        mode=NetworkMode.TESTNET,
        monitor_mode=MonitorMode.SHADOW,
    )


# ------------------------------------------------------------------


def test_adapter_properties(adapter):
    assert adapter.rollup_type == RollupType.STRATA
    assert adapter.bridge_name == "Strata Bridge"
    assert adapter.mode == NetworkMode.TESTNET
    assert adapter.monitor_mode == MonitorMode.SHADOW


def test_adapter_defaults():
    a = StrataAdapter("http://localhost:8545")
    assert a.mode == NetworkMode.TESTNET
    assert a.monitor_mode == MonitorMode.SHADOW


@pytest.mark.asyncio
async def test_get_latest_block_number(adapter):
    mock_rpc = AsyncMock(return_value={"result": "0x200"})

    with patch.object(adapter, "_rpc", mock_rpc):
        num = await adapter.get_latest_block_number()
        assert num == 0x200
        mock_rpc.assert_awaited_once_with("eth_blockNumber")


@pytest.mark.asyncio
async def test_get_block_latest(adapter):
    mock_rpc = AsyncMock(
        return_value={
            "result": {
                "number": "0xc8",
                "hash": "0xdef456",
                "parentHash": "0xdef455",
                "timestamp": "0x663d8001",
                "transactions": [],
                "gasUsed": "0x61a8",
                "gasLimit": "0x1c9c380",
                "extraData": "0x",
            }
        }
    )

    with patch.object(adapter, "_rpc", mock_rpc):
        block = await adapter.get_block("latest")
        assert block.number == 200
        assert block.hash == "0xdef456"
        assert block.gas_used == 25000


@pytest.mark.asyncio
async def test_get_bridge_status(adapter):
    status = await adapter.get_bridge_status()
    assert status.rollup_type == RollupType.STRATA
    assert status.bridge_name == "Strata Bridge"
    assert status.operator_count == 8
    assert status.is_healthy is True


@pytest.mark.asyncio
async def test_is_healthy(adapter):
    mock_rpc = AsyncMock(return_value={"result": "0x1"})
    with patch.object(adapter, "_rpc", mock_rpc):
        healthy = await adapter.is_healthy()
        assert healthy is True


@pytest.mark.asyncio
async def test_get_network_status(adapter):
    mock_rpc = AsyncMock()
    mock_rpc.side_effect = [
        {"result": False},            # eth_syncing
        {"result": "0xc8"},           # eth_blockNumber
        {"result": "0x4a817c800"},    # eth_gasPrice
        {"result": "0x10"},           # net_peerCount
    ]

    with patch.object(adapter, "_rpc", mock_rpc):
        status = await adapter.get_network_status()
        assert status.rollup_type == RollupType.STRATA
        assert status.latest_block == 200
        assert status.is_syncing is False
        assert status.peer_count == 16
        assert status.gas_price == 20_000_000_000
