import { createLogger } from "./logger";
import { generateId } from "./idgen";

const log = createLogger("Ark");

export const MAX_VUTXO_CAPACITY = 1000;
export const DEFAULT_EXIT_TIMELOCK_BLOCKS = 144; // ~24 hours on Bitcoin

export type VUTXOStatus =
  | 'boarded'
  | 'available'
  | 'locked'
  | 'spent'
  | 'forfeited'
  | 'unboarded'
  | 'expired'
  | 'tombstoned';

export interface ForfeitTransaction {
  vutxoId: string;
  aspPubKey: string;
  forfeitTxHex: string;
  createdBlockHeight: number;
  signed: boolean;
}

export interface VUTXO {
  id: string;
  amountSat: number;
  ownerAddress: string;
  aspId: string;
  status: VUTXOStatus;
  createdAt: number;
  expiresAt: number;
  exitTimelockBlocks: number;
  forfeitTx?: ForfeitTransaction;
  onchainDepositTxid?: string;
  unboardTxid?: string;
  tombstoneReason?: string;
}

export interface BoardOptions {
  amountSat: number;
  ownerAddress: string;
  aspId?: string;
  onchainDepositTxid?: string;
  exitTimelockBlocks?: number;
  ttlSeconds?: number;
}

export interface UnboardOptions {
  vutxoId: string;
  destinationAddress: string;
  currentBlockHeight: number;
  isCollaborative?: boolean;
}

export class ArkAdapter {
  private vutxos: Map<string, VUTXO> = new Map();

  /**
   * Returns current active V-UTXO count in memory.
   */
  public getVUTXOCount(): number {
    return this.vutxos.size;
  }

  /**
   * Retrieves a V-UTXO by ID.
   */
  public getVUTXO(id: string): VUTXO | undefined {
    return this.vutxos.get(id);
  }

  /**
   * Boards L1 funds into an off-chain V-UTXO managed by an Ark Service Provider (ASP).
   */
  public async boardVUTXO(options: BoardOptions): Promise<VUTXO> {
    if (this.vutxos.size >= MAX_VUTXO_CAPACITY) {
      log.error(`Capacity exceeded: max ${MAX_VUTXO_CAPACITY} V-UTXOs supported`);
      throw new Error(`Ark capacity exceeded: maximum ${MAX_VUTXO_CAPACITY} V-UTXOs allowed`);
    }

    if (options.amountSat <= 0) {
      throw new Error("Invalid V-UTXO amount: must be greater than zero satoshis");
    }

    if (!options.ownerAddress || options.ownerAddress.trim() === '') {
      throw new Error("Invalid owner address: address required");
    }

    const id = `vutxo-${generateId("vutxo")}`;
    const now = Date.now();
    const ttlSeconds = options.ttlSeconds ?? 86400 * 7; // Default 7 days TTL
    const exitTimelockBlocks = options.exitTimelockBlocks ?? DEFAULT_EXIT_TIMELOCK_BLOCKS;

    const vutxo: VUTXO = {
      id,
      amountSat: options.amountSat,
      ownerAddress: options.ownerAddress,
      aspId: options.aspId ?? 'asp-default-01',
      status: 'available',
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      exitTimelockBlocks,
      onchainDepositTxid: options.onchainDepositTxid,
    };

    this.vutxos.set(id, vutxo);
    log.info(`Boarded V-UTXO ${id} for ${options.amountSat} sats (Owner: ${options.ownerAddress})`);
    return vutxo;
  }

  /**
   * Compatibility method: Receives a V-UTXO.
   */
  public async receiveVUTXO(amount: number, owner: string): Promise<VUTXO> {
    return this.boardVUTXO({ amountSat: amount, ownerAddress: owner });
  }

  /**
   * Registers a pre-signed forfeit transaction for an existing V-UTXO.
   */
  public registerForfeitTx(vutxoId: string, forfeitTxHex: string, aspPubKey: string, currentBlockHeight: number): VUTXO {
    const vutxo = this.vutxos.get(vutxoId);
    if (!vutxo) {
      throw new Error(`V-UTXO ${vutxoId} not found`);
    }

    if (vutxo.status !== 'available' && vutxo.status !== 'boarded') {
      throw new Error(`Cannot register forfeit transaction for V-UTXO in status: ${vutxo.status}`);
    }

    vutxo.forfeitTx = {
      vutxoId,
      aspPubKey,
      forfeitTxHex,
      createdBlockHeight: currentBlockHeight,
      signed: true,
    };

    log.info(`Registered forfeit transaction for V-UTXO ${vutxoId}`);
    return vutxo;
  }

  /**
   * Spends or transfers an available V-UTXO off-chain.
   */
  public async spendVUTXO(id: string): Promise<boolean> {
    const vutxo = this.vutxos.get(id);
    if (!vutxo) {
      log.warn(`Spend failed: V-UTXO ${id} not found`);
      return false;
    }

    if (vutxo.status !== 'available') {
      log.warn(`Spend failed: V-UTXO ${id} status is ${vutxo.status}`);
      return false;
    }

    vutxo.status = 'spent';
    log.info(`Spent V-UTXO ${id}`);
    return true;
  }

  /**
   * Claims a forfeit transaction (ASP anti-double spend / emergency recovery).
   */
  public claimForfeit(vutxoId: string): boolean {
    const vutxo = this.vutxos.get(vutxoId);
    if (!vutxo) {
      throw new Error(`V-UTXO ${vutxoId} not found`);
    }

    if (!vutxo.forfeitTx) {
      throw new Error(`No forfeit transaction registered for V-UTXO ${vutxoId}`);
    }

    if (vutxo.status === 'forfeited' || vutxo.status === 'tombstoned') {
      return false;
    }

    vutxo.status = 'forfeited';
    log.info(`Forfeit transaction claimed for V-UTXO ${vutxoId} by ASP ${vutxo.aspId}`);
    return true;
  }

  /**
   * Unboards a V-UTXO back to Bitcoin L1.
   * - Collaborative: Instant settlement with ASP signature.
   * - Unilateral: Requires waiting out the relative exit timelock.
   */
  public async unboardVUTXO(options: UnboardOptions): Promise<VUTXO> {
    const vutxo = this.vutxos.get(options.vutxoId);
    if (!vutxo) {
      throw new Error(`V-UTXO ${options.vutxoId} not found`);
    }

    if (vutxo.status !== 'available' && vutxo.status !== 'boarded') {
      throw new Error(`Cannot unboard V-UTXO in status ${vutxo.status}`);
    }

    const isCollaborative = options.isCollaborative ?? true;

    if (!isCollaborative) {
      // Unilateral exit check
      const depositBlockHeight = vutxo.forfeitTx?.createdBlockHeight ?? 0;
      const blocksElapsed = options.currentBlockHeight - depositBlockHeight;

      if (blocksElapsed < vutxo.exitTimelockBlocks) {
        throw new Error(
          `Unilateral exit timelock active: ${blocksElapsed}/${vutxo.exitTimelockBlocks} blocks elapsed`
        );
      }
    }

    vutxo.status = 'unboarded';
    vutxo.unboardTxid = `txid-unboard-${generateId("tx")}`;
    log.info(
      `Unboarded V-UTXO ${vutxo.id} to L1 ${options.destinationAddress} (${
        isCollaborative ? 'Collaborative' : 'Unilateral'
      })`
    );
    return vutxo;
  }

  /**
   * Cleans up expired V-UTXOs and updates their status.
   */
  public sweepExpiredVUTXOs(now: number = Date.now()): number {
    let swept = 0;
    for (const vutxo of this.vutxos.values()) {
      if (vutxo.status === 'available' && vutxo.expiresAt <= now) {
        vutxo.status = 'expired';
        swept++;
      }
    }
    if (swept > 0) {
      log.info(`Swept ${swept} expired V-UTXOs`);
    }
    return swept;
  }

  /**
   * Tombstones a disputed, double-spent, or corrupted V-UTXO.
   */
  public tombstoneVUTXO(id: string, reason: string): boolean {
    const vutxo = this.vutxos.get(id);
    if (!vutxo) return false;

    vutxo.status = 'tombstoned';
    vutxo.tombstoneReason = reason;
    log.warn(`Tombstoned V-UTXO ${id}: ${reason}`);
    return true;
  }

  /**
   * Clears all V-UTXOs from memory (for testing or reset).
   */
  public reset(): void {
    this.vutxos.clear();
  }
}

export const arkAdapter = new ArkAdapter();
