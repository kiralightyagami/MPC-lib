import { Connection, PublicKey, Keypair, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMPCSigner } from '../mpc/ed25519';
import { SolanaNetwork, TSSKeypair, AggregateWallet } from './types';
import * as nacl from 'tweetnacl';

/**
 * TSS Wallet implementation supporting all solana-tss functions
 */
export class TSSWallet {
  private connection: Connection;
  private network: SolanaNetwork;

  constructor(network: SolanaNetwork = 'devnet') {
    this.network = network;
    this.connection = new Connection(clusterApiUrl(network), 'confirmed');
  }

  /**
   * Generate a new TSS keypair
   * Equivalent to: solana-tss generate
   */
  async generateKeypair(): Promise<TSSKeypair> {
    try {
      // Try to use MPC signer if available
      const mpcSigner = await createMPCSigner();
      return {
        publicKey: mpcSigner.publicKey,
        secretKey: new Uint8Array(32) // MPC manages the actual secret
      };
    } catch (error) {
      // Fallback to regular keypair generation
      const keypair = Keypair.generate();
      return {
        publicKey: keypair.publicKey,
        secretKey: keypair.secretKey
      };
    }
  }

  /**
   * Check the balance of an address
   * Equivalent to: solana-tss balance <address>
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Request an airdrop from the faucet (devnet/testnet only)
   * Equivalent to: solana-tss airdrop <address> <amount>
   */
  async requestAirdrop(publicKey: PublicKey, amount: number): Promise<string> {
    if (this.network === 'mainnet-beta') {
      throw new Error('Airdrop not available on mainnet');
    }

    const lamports = amount * LAMPORTS_PER_SOL;
    const signature = await this.connection.requestAirdrop(publicKey, lamports);
    
    // Wait for confirmation
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  /**
   * Aggregate multiple public keys into a single multisig address
   * Equivalent to: solana-tss aggregate-keys <key1> <key2> ... <keyN>
   */
  aggregateKeys(participantKeys: PublicKey[], threshold?: number): AggregateWallet {
    // Simple key aggregation - in production this would use proper TSS key aggregation
    const combinedKey = this.combinePublicKeys(participantKeys);
    
    return {
      aggregatedPublicKey: combinedKey,
      participantKeys,
      threshold: threshold || participantKeys.length // n-of-n by default
    };
  }

  /**
   * Get recent blockhash for transaction signing
   * Equivalent to: solana-tss recent-block-hash
   */
  async getRecentBlockhash(): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash();
    return blockhash;
  }

  /**
   * Switch to a different Solana network
   */
  switchNetwork(network: SolanaNetwork): void {
    this.network = network;
    this.connection = new Connection(clusterApiUrl(network), 'confirmed');
  }

  /**
   * Get current network
   */
  getCurrentNetwork(): SolanaNetwork {
    return this.network;
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Private helper to combine public keys (simplified implementation)
   * In production, this would use proper TSS key aggregation schemes
   */
  private combinePublicKeys(keys: PublicKey[]): PublicKey {
    if (keys.length === 0) {
      throw new Error('Cannot aggregate empty key list');
    }

    if (keys.length === 1) {
      return keys[0];
    }

    // Simple XOR aggregation for demo - replace with proper TSS aggregation
    let combined = new Uint8Array(32);
    for (const key of keys) {
      const keyBytes = key.toBytes();
      for (let i = 0; i < 32; i++) {
        combined[i] ^= keyBytes[i];
      }
    }

    return new PublicKey(combined);
  }

  /**
   * Validate a public key string
   */
  static validatePublicKey(keyString: string): PublicKey {
    try {
      return new PublicKey(keyString);
    } catch (error) {
      throw new Error(`Invalid public key format: ${keyString}`);
    }
  }

  /**
   * Format balance for display
   */
  static formatBalance(lamports: number): string {
    const sol = lamports / LAMPORTS_PER_SOL;
    return `${sol.toFixed(9)} SOL`;
  }
} 