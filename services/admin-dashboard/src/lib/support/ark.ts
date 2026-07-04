import { createLogger } from "./logger";
import { generateId } from "./idgen";
const log = createLogger("Ark");

/**
 * G-23: Ark V-UTXO Protocol
 *
 * Ark is a trustless, off-chain Bitcoin layer that enables
 * instant, low-cost payments via Virtual UTXOs (V-UTXOs).
 */

export interface VUTXO {
  id: string;
  amount: number;
  ownerAddress: string;
  status: 'available' | 'locked' | 'spent';
}

export class ArkAdapter {
  private vutxos: Map<string, VUTXO> = new Map();

  /**
   * Receives a V-UTXO via an Ark ASP (Ark Service Provider).
   */
  public async receiveVUTXO(amount: number, owner: string): Promise<VUTXO> {
    const id = `vutxo-${generateId("vutxo")}`;
    const vutxo: VUTXO = {
      id,
      amount,
      ownerAddress: owner,
      status: 'available'
    };

    this.vutxos.set(id, vutxo);
    log.info(` Received V-UTXO ${id} for ${amount} sats`);
    return vutxo;
  }

  /**
   * Spends a V-UTXO.
   */
  public async spendVUTXO(id: string): Promise<boolean> {
    const vutxo = this.vutxos.get(id);
    if (!vutxo || vutxo.status !== 'available') return false;

    vutxo.status = 'spent';
    log.info(` Spent V-UTXO ${id}`);
    return true;
  }
}

export const arkAdapter = new ArkAdapter();
