"""Tests for the Citrea adapter."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from conxian_nexus.adapters.citrea import CitreaAdapter
from conxian_nexus.types import MonitorMode, NetworkMode, RollupType


@pytest.fixture
def adapter():
    return CitreaAdapter(
        rpc_url="https://rpc.testnet.citrea.xyz",
        mode=NetworkMode.TESTNET,
        monitor_mode=MonitorMode.SHADOW,
    )


# ------------------------------------------------------------------


def test_adapter_properties(adapter):
    assert adapter.rollup_type == RollupType.CITREA
    assert adapter.bridge_name == "Clementine"
    assert adapter.mode == NetworkMode.TESTNET
    assert adapter.monitor_mode == MonitorMode.SHADOW


def test_adapter_defaults():
    a = CitreaAdapter("http://localhost:8545")
    assert a.mode == NetworkMode.TESTNET
    assert a.monitor_mode == MonitorMode.SHADOW


@pytest.mark.asyncio
async def test_get_latest_block_number(adapter):
    mock_rpc = AsyncMock(return_value={"result": "0xabc"})

    with patch.object(adapter, "_rpc", mock_rpc):
        num = await adapter.get_latest_block_number()
        assert num == 0xABC
        mock_rpc.assert_awaited_once_with("eth_blockNumber")


@pytest.mark.asyncio
async def test_get_block_latest(adapter):
    mock_rpc = AsyncMock(
        return_value={
            "result": {
                "number": "0x64",
                "hash": "0xabc123",
                "parentHash": "0xabc122",
                "timestamp": "0x663d8000",
                "transactions": [],
                "gasUsed": "0x5208",
                "gasLimit": "0x1c9c380",
                "extraData": "0x",
            }
        }
    )

    with patch.object(adapter, "_rpc", mock_rpc):
        block = await adapter.get_block("latest")
        assert block.number == 100
        assert block.hash == "0xabc123"
        assert block.gas_used == 21000
        mock_rpc.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_transaction(adapter):
    mock_rpc = AsyncMock()
    mock_rpc.side_effect = [
        {
            "result": {
                "hash": "0xtxhash",
                "blockNumber": "0x64",
                "from": "0xsender",
                "to": "0xreceiver",
                "value": "0xde0b6b3a7640000",
                "gasPrice": "0x4a817c800",
                "input": "0x",
            }
        },
        {"result": {"gasUsed": "0x5208", "status": "0x1"}},
    ]

    with patch.object(adapter, "_rpc", mock_rpc):
        tx = await adapter.get_transaction("0xtxhash")
        assert tx.hash == "0xtxhash"
        assert tx.value == 1_000_000_000_000_000_000
        assert tx.gas_used == 21000
        assert tx.status == 1
        assert mock_rpc.await_count == 2


@pytest.mark.asyncio
async def test_get_transaction_not_found(adapter):
    mock_rpc = AsyncMock(return_value={"result": None})

    with patch.object(adapter, "_rpc", mock_rpc):
        with pytest.raises(ValueError, match="Transaction not found"):
            await adapter.get_transaction("0xdead")


@pytest.mark.asyncio
async def test_get_bridge_status(adapter):
    status = await adapter.get_bridge_status()
    assert status.rollup_type == RollupType.CITREA
    assert status.bridge_name == "Clementine"
    assert status.operator_count == 15
    assert status.is_healthy is False  # locked BTC = 0


@pytest.mark.asyncio
async def test_is_healthy(adapter):
    mock_rpc = AsyncMock(return_value={"result": "0x1"})
    with patch.object(adapter, "_rpc", mock_rpc):
        healthy = await adapter.is_healthy()
        assert healthy is True


@pytest.mark.asyncio
async def test_is_healthy_failure(adapter):
    mock_rpc = AsyncMock(side_effect=Exception("RPC down"))
    with patch.object(adapter, "_rpc", mock_rpc):
        healthy = await adapter.is_healthy()
        assert healthy is False


@pytest.mark.asyncio
async def test_get_network_status(adapter):
    mock_rpc = AsyncMock()
    mock_rpc.side_effect = [
        {"result": False},            # eth_syncing
        {"result": "0x64"},           # eth_blockNumber
        {"result": "0x4a817c800"},    # eth_gasPrice
        {"result": "0x8"},            # net_peerCount
        {"result": "0xb87"},          # eth_chainId
    ]

    with patch.object(adapter, "_rpc", mock_rpc):
        status = await adapter.get_network_status()
        assert status.rollup_type == RollupType.CITREA
        assert status.latest_block == 100
        assert status.is_syncing is False
        assert status.peer_count == 8
        assert status.gas_price == 20_000_000_000


@pytest.mark.asyncio
async def test_get_transactions_by_block(adapter):
    mock_rpc = AsyncMock(
        return_value={
            "result": {
                "transactions": [
                    {
                        "hash": "0xtx1",
                        "blockNumber": "0x64",
                        "from": "0xsender1",
                        "to": "0xrecv1",
                        "value": "0x1",
                        "gasPrice": "0x2",
                        "input": "0x",
                    },
                    {
                        "hash": "0xtx2",
                        "blockNumber": "0x64",
                        "from": "0xsender2",
                        "to": None,
                        "value": "0x3",
                        "gasPrice": "0x4",
                        "input": "0xabcd",
                    },
                ]
            }
        }
    )

    with patch.object(adapter, "_rpc", mock_rpc):
        txs = await adapter.get_transactions_by_block(100)
        assert len(txs) == 2
        assert txs[0].hash == "0xtx1"
        assert txs[1].to_address is None
