"""Shadow-mode monitoring for T1 rollup adapters.

Shadow mode provides passive, read-only observation of rollup state.
It never submits transactions — it polls blocks and transactions,
emitting structured events for downstream consumers (metrics, alerting,
storage).
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from typing import Optional

from conxian_nexus.adapters.base import BaseAdapter
from conxian_nexus.types import BlockData, RollupType, ShadowEvent, TransactionData

logger = logging.getLogger(__name__)

# Default poll interval for block scanning (seconds)
_DEFAULT_POLL_INTERVAL = 2.0


class ShadowMonitor:
    """Poll-based shadow monitor that wraps one or more adapters.

    The monitor periodically fetches the latest block from each adapter,
    emits ``ShadowEvent``s for every new block and for every transaction
    inside it, and exposes bridge / network status snapshots.  All
    operations are read-only — no keys are needed.

    Usage::

        async with ShadowMonitor(adapter) as monitor:
            async for event in monitor.stream_blocks():
                print(event.rollup_type, event.event_type, event.block_number)
    """

    def __init__(self, *adapters: BaseAdapter, poll_interval: float = _DEFAULT_POLL_INTERVAL):
        if not adapters:
            raise ValueError("At least one adapter is required")
        self._adapters = list(adapters)
        self._poll_interval = poll_interval
        self._seen_blocks: dict[RollupType, set[int]] = {
            a.rollup_type: set() for a in self._adapters
        }
        self._queue: asyncio.Queue[ShadowEvent] = asyncio.Queue()
        self._running = False
        self._tasks: list[asyncio.Task] = []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def __aenter__(self) -> ShadowMonitor:
        await self.start()
        return self

    async def __aexit__(self, *args) -> None:
        await self.stop()

    async def start(self) -> None:
        """Launch background pollers for every registered adapter."""
        if self._running:
            return
        self._running = True
        for adapter in self._adapters:
            self._tasks.append(asyncio.create_task(self._poll_adapter(adapter)))
        logger.info("ShadowMonitor started for %d adapter(s)", len(self._adapters))

    async def stop(self) -> None:
        """Cancel all background tasks and drain the event queue."""
        self._running = False
        for task in self._tasks:
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()
        logger.info("ShadowMonitor stopped")

    async def stream_blocks(self) -> AsyncIterator[ShadowEvent]:
        """Yield ``ShadowEvent``s as new blocks are observed."""
        while self._running or not self._queue.empty():
            try:
                event = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                yield event
            except asyncio.TimeoutError:
                continue

    async def get_status_snapshot(self) -> dict[RollupType, dict]:
        """Return a one-shot status snapshot for all adapters."""
        snap: dict[RollupType, dict] = {}
        for adapter in self._adapters:
            try:
                network = await adapter.get_network_status()
                bridge = await adapter.get_bridge_status()
                snap[adapter.rollup_type] = {
                    "network": network,
                    "bridge": bridge,
                }
            except Exception:
                logger.exception("Status snapshot failed for %s", adapter.rollup_type)
        return snap

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _poll_adapter(self, adapter: BaseAdapter) -> None:
        """Continuously fetch the latest block and emit events."""
        logger.info("Polling adapter %s every %.1fs", adapter.rollup_type.value, self._poll_interval)
        while self._running:
            try:
                block = await adapter.get_block("latest")
                seen = self._seen_blocks[adapter.rollup_type]

                if block.number not in seen:
                    seen.add(block.number)
                    await self._emit_block(adapter.rollup_type, block)
                    await self._emit_transactions(adapter.rollup_type, block)
            except Exception:
                logger.exception("Poll error for %s", adapter.rollup_type.value)
            await asyncio.sleep(self._poll_interval)

    async def _emit_block(self, rollup_type: RollupType, block: BlockData) -> None:
        event = ShadowEvent(
            event_type="new_block",
            rollup_type=rollup_type,
            block_number=block.number,
            timestamp=block.timestamp,
            payload={
                "hash": block.hash,
                "parent_hash": block.parent_hash,
                "transaction_count": block.transaction_count,
                "gas_used": block.gas_used,
                "gas_limit": block.gas_limit,
            },
        )
        await self._queue.put(event)
        logger.debug("Emitted new_block %s:%d", rollup_type.value, block.number)

    async def _emit_transactions(self, rollup_type: RollupType, block: BlockData) -> None:
        if block.transaction_count == 0:
            return
        for i, adapter in enumerate(self._adapters):
            if adapter.rollup_type != rollup_type:
                continue
            try:
                txs = await adapter.get_transactions_by_block(block.number)
                for tx in txs:
                    event = ShadowEvent(
                        event_type="transaction",
                        rollup_type=rollup_type,
                        block_number=block.number,
                        timestamp=block.timestamp,
                        payload={
                            "hash": tx.hash,
                            "from": tx.from_address,
                            "to": tx.to_address,
                            "value": tx.value,
                            "gas_price": tx.gas_price,
                            "gas_used": tx.gas_used,
                            "status": tx.status,
                        },
                    )
                    await self._queue.put(event)
            except Exception:
                logger.exception("Failed to fetch txs for block %d", block.number)
            break  # only query the matching adapter once
