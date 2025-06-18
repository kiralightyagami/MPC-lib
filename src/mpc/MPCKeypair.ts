import { Signer, Transaction, PublicKey } from '@solana/web3.js';
import { MPCSigner } from './Signer';

export class MPCKeypair implements Signer {
  public publicKey: PublicKey;
  public secretKey: Uint8Array; // Required by Signer interface
  private mpcSigner: MPCSigner;

  constructor(mpcSigner: MPCSigner) {
    this.publicKey = mpcSigner.publicKey;
    this.mpcSigner = mpcSigner;
    // Initialize with empty array - actual secret key is managed by MPC
    this.secretKey = new Uint8Array(32); 
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    return this.mpcSigner.sign(message);
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    const msg = tx.serializeMessage();
    const sig = await this.sign(msg);
    tx.addSignature(this.publicKey, Buffer.from(sig));
    return tx;
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return Promise.all(txs.map((tx) => this.signTransaction(tx)));
  }
}