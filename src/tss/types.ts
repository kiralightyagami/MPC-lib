import { PublicKey } from '@solana/web3.js';

/**
 * Network configuration for Solana TSS operations
 */
export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';

/**
 * TSS Keypair structure
 */
export interface TSSKeypair {
  publicKey: PublicKey;
  secretKey: Uint8Array;
}

/**
 * Partial signature for TSS aggregation
 */
export interface PartialSignature {
  signer: PublicKey;
  signature: Uint8Array;
  nonce: Uint8Array;
}

/**
 * TSS wallet aggregate data
 */
export interface AggregateWallet {
  aggregatedPublicKey: PublicKey;
  participantKeys: PublicKey[];
  threshold: number;
}

/**
 * Step 1 data for aggregate signing
 */
export interface AggSignStepOneData {
  secretNonce: Uint8Array;
  publicNonce: Uint8Array;
  participantKey: PublicKey;
}

/**
 * Step 2 data for aggregate signing
 */
export interface AggSignStepTwoData {
  partialSignature: Uint8Array;
  publicNonce: Uint8Array;
  participantKey: PublicKey;
}

/**
 * Transaction details for TSS signing
 */
export interface TSSTransactionDetails {
  amount: number;
  to: PublicKey;
  from: PublicKey;
  network: SolanaNetwork;
  memo?: string;
  recentBlockhash: string;
}

/**
 * Complete TSS signature ready for broadcast
 */
export interface CompleteSignature {
  signature: Uint8Array;
  publicKey: PublicKey;
  transaction: Uint8Array;
} 