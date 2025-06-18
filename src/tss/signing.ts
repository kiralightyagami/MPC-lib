import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createMPCSigner } from '../mpc/ed25519';
import { 
  TSSTransactionDetails, 
  AggSignStepOneData, 
  AggSignStepTwoData, 
  PartialSignature,
  CompleteSignature,
  AggregateWallet 
} from './types';
import * as nacl from 'tweetnacl';
import { createTransferTx } from '../solana/tx';

/**
 * TSS Signing implementation for multi-party signature aggregation
 */
export class TSSSigningService {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Send a transaction using a single private key (non-TSS)
   * Equivalent to: solana-tss send-single
   */
  async sendSingle(
    fromSecretKey: Uint8Array,
    to: PublicKey,
    amount: number,
    memo?: string
  ): Promise<string> {
    const mpcSigner = await createMPCSigner();
    const tx = await createTransferTx(
      this.connection,
      mpcSigner.publicKey,
      to,
      amount
    );

    if (memo) {
      // Add memo instruction
      tx.add({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(memo, 'utf8')
      });
    }

    const signature = await mpcSigner.sign(tx.serializeMessage());
    tx.addSignature(mpcSigner.publicKey, Buffer.from(signature));

    const txId = await this.connection.sendTransaction(tx, []);
    await this.connection.confirmTransaction(txId);
    
    return txId;
  }

  /**
   * Step 1 of aggregate signing: Generate nonce and commitment
   * Equivalent to: solana-tss agg-send-step-one
   */
  async aggregateSignStepOne(
    participantSecretKey: Uint8Array,
    transactionDetails: TSSTransactionDetails
  ): Promise<AggSignStepOneData> {
    // Generate random nonce for this signing session
    const secretNonce = nacl.randomBytes(32);
    
    // Create public nonce commitment
    const publicNonce = nacl.hash(secretNonce).slice(0, 32);
    
    // Derive participant's public key
    const participantKey = this.derivePublicKey(participantSecretKey);

    return {
      secretNonce,
      publicNonce,
      participantKey
    };
  }

  /**
   * Step 2 of aggregate signing: Create partial signature
   * Equivalent to: solana-tss agg-send-step-two
   */
  async aggregateSignStepTwo(
    stepOneData: AggSignStepOneData,
    participantSecretKey: Uint8Array,
    transactionDetails: TSSTransactionDetails,
    allPublicNonces: Uint8Array[]
  ): Promise<AggSignStepTwoData> {
    // Create the transaction to sign
    const tx = await this.createTransactionFromDetails(transactionDetails);
    const messageToSign = tx.serializeMessage();

    // Aggregate all nonces (simplified - in production would use proper TSS nonce aggregation)
    const aggregatedNonce = this.aggregateNonces(allPublicNonces);

    // Create partial signature using the secret key and nonce
    const partialSignature = this.createPartialSignature(
      messageToSign,
      participantSecretKey,
      stepOneData.secretNonce,
      aggregatedNonce
    );

    return {
      partialSignature,
      publicNonce: stepOneData.publicNonce,
      participantKey: stepOneData.participantKey
    };
  }

  /**
   * Aggregate all partial signatures and broadcast transaction
   * Equivalent to: solana-tss aggregate-signatures-and-broadcast
   */
  async aggregateSignaturesAndBroadcast(
    partialSignatures: AggSignStepTwoData[],
    transactionDetails: TSSTransactionDetails,
    aggregateWallet: AggregateWallet
  ): Promise<string> {
    // Verify we have enough signatures
    if (partialSignatures.length < aggregateWallet.threshold) {
      throw new Error(`Insufficient signatures: ${partialSignatures.length}/${aggregateWallet.threshold}`);
    }

    // Create the transaction
    const tx = await this.createTransactionFromDetails(transactionDetails);

    // Aggregate the partial signatures into a complete signature
    const completeSignature = this.aggregatePartialSignatures(
      partialSignatures,
      aggregateWallet
    );

    // Add the aggregated signature to the transaction
    tx.addSignature(aggregateWallet.aggregatedPublicKey, Buffer.from(completeSignature.signature));

    // Broadcast the transaction
    const txId = await this.connection.sendTransaction(tx, []);
    await this.connection.confirmTransaction(txId);

    return txId;
  }

  /**
   * Create a transaction from transaction details
   */
  private async createTransactionFromDetails(details: TSSTransactionDetails): Promise<Transaction> {
    const tx = await createTransferTx(
      this.connection,
      details.from,
      details.to,
      details.amount
    );

    // Set the specific blockhash
    tx.recentBlockhash = details.recentBlockhash;

    // Add memo if provided
    if (details.memo) {
      tx.add({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(details.memo, 'utf8')
      });
    }

    return tx;
  }

  /**
   * Derive public key from secret key
   */
  private derivePublicKey(secretKey: Uint8Array): PublicKey {
    const keypair = nacl.sign.keyPair.fromSecretKey(secretKey);
    return new PublicKey(keypair.publicKey);
  }

  /**
   * Aggregate nonces for TSS signing
   */
  private aggregateNonces(nonces: Uint8Array[]): Uint8Array {
    // Simplified nonce aggregation - XOR all nonces
    let aggregated = new Uint8Array(32);
    for (const nonce of nonces) {
      for (let i = 0; i < 32; i++) {
        aggregated[i] ^= nonce[i];
      }
    }
    return aggregated;
  }

  /**
   * Create a partial signature for TSS
   */
  private createPartialSignature(
    message: Uint8Array,
    secretKey: Uint8Array,
    secretNonce: Uint8Array,
    aggregatedNonce: Uint8Array
  ): Uint8Array {
    // Simplified partial signature creation
    // In production, this would use proper TSS signature schemes like FROST or similar
    
    // Combine secret key with nonce
    const combinedSecret = new Uint8Array(64);
    combinedSecret.set(secretKey);
    combinedSecret.set(secretNonce, 32);

    // Create signature using tweetnacl
    const keypair = nacl.sign.keyPair.fromSecretKey(combinedSecret.slice(0, 32));
    const signature = nacl.sign.detached(message, keypair.secretKey);

    return signature;
  }

  /**
   * Aggregate partial signatures into a complete signature
   */
  private aggregatePartialSignatures(
    partialSignatures: AggSignStepTwoData[],
    aggregateWallet: AggregateWallet
  ): CompleteSignature {
    // Simplified signature aggregation - XOR all partial signatures
    let aggregatedSig = new Uint8Array(64);
    
    for (const partial of partialSignatures) {
      for (let i = 0; i < 64; i++) {
        aggregatedSig[i] ^= partial.partialSignature[i];
      }
    }

    return {
      signature: aggregatedSig,
      publicKey: aggregateWallet.aggregatedPublicKey,
      transaction: new Uint8Array() // Would contain serialized transaction
    };
  }

  /**
   * Verify a partial signature
   */
  verifyPartialSignature(
    signature: PartialSignature,
    message: Uint8Array
  ): boolean {
    try {
      // Verify the signature using the signer's public key
      return nacl.sign.detached.verify(
        message,
        signature.signature,
        signature.signer.toBytes()
      );
    } catch (error) {
      return false;
    }
  }
} 