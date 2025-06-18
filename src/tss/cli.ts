import { PublicKey } from '@solana/web3.js';
import { TSSWallet } from './wallet';
import { TSSSigningService } from './signing';
import { SolanaNetwork, TSSTransactionDetails, AggSignStepOneData, AggSignStepTwoData } from './types';

/**
 * CLI interface matching the original solana-tss functionality
 */
export class TSSCli {
  private wallet: TSSWallet;
  private signingService: TSSSigningService;

  constructor(network: SolanaNetwork = 'devnet') {
    this.wallet = new TSSWallet(network);
    this.signingService = new TSSSigningService(this.wallet.getConnection());
  }

  /**
   * Generate a pair of keys
   * solana-tss generate
   */
  async generate(): Promise<{
    publicKey: string;
    secretKey: string;
  }> {
    const keypair = await this.wallet.generateKeypair();
    return {
      publicKey: keypair.publicKey.toString(),
      secretKey: Buffer.from(keypair.secretKey).toString('hex')
    };
  }

  /**
   * Check the balance of an address
   * solana-tss balance <address>
   */
  async balance(address: string): Promise<number> {
    const publicKey = TSSWallet.validatePublicKey(address);
    return await this.wallet.getBalance(publicKey);
  }

  /**
   * Request an airdrop from a faucet
   * solana-tss airdrop <address> <amount>
   */
  async airdrop(address: string, amount: number): Promise<string> {
    const publicKey = TSSWallet.validatePublicKey(address);
    return await this.wallet.requestAirdrop(publicKey, amount);
  }

  /**
   * Send a transaction using a single private key
   * solana-tss send-single <from_secret> <to> <amount> [memo]
   */
  async sendSingle(
    fromSecretHex: string,
    to: string,
    amount: number,
    memo?: string
  ): Promise<string> {
    const fromSecret = new Uint8Array(Buffer.from(fromSecretHex, 'hex'));
    const toPublicKey = TSSWallet.validatePublicKey(to);
    
    return await this.signingService.sendSingle(
      fromSecret,
      toPublicKey,
      amount,
      memo
    );
  }

  /**
   * Aggregate a list of addresses into a single address
   * solana-tss aggregate-keys <key1> <key2> ... <keyN>
   */
  aggregateKeys(keyStrings: string[], threshold?: number): {
    aggregatedPublicKey: string;
    participantKeys: string[];
    threshold: number;
  } {
    const keys = keyStrings.map(keyStr => TSSWallet.validatePublicKey(keyStr));
    const aggregateWallet = this.wallet.aggregateKeys(keys, threshold);
    
    return {
      aggregatedPublicKey: aggregateWallet.aggregatedPublicKey.toString(),
      participantKeys: aggregateWallet.participantKeys.map(k => k.toString()),
      threshold: aggregateWallet.threshold
    };
  }

  /**
   * Start aggregate signing
   * solana-tss agg-send-step-one <participant_secret> <to> <amount> <network> [memo] [recent_block_hash]
   */
  async aggregateSignStepOne(
    participantSecretHex: string,
    to: string,
    amount: number,
    memo?: string,
    recentBlockhash?: string
  ): Promise<{
    secretNonce: string;
    publicNonce: string;
    participantKey: string;
  }> {
    const participantSecret = new Uint8Array(Buffer.from(participantSecretHex, 'hex'));
    const toPublicKey = TSSWallet.validatePublicKey(to);
    const fromPublicKey = TSSWallet.validatePublicKey(to); // Will be derived from secret in real implementation

    const blockHash = recentBlockhash || await this.wallet.getRecentBlockhash();

    const transactionDetails: TSSTransactionDetails = {
      amount,
      to: toPublicKey,
      from: fromPublicKey,
      network: this.wallet.getCurrentNetwork(),
      memo,
      recentBlockhash: blockHash
    };

    const stepOneData = await this.signingService.aggregateSignStepOne(
      participantSecret,
      transactionDetails
    );

    return {
      secretNonce: Buffer.from(stepOneData.secretNonce).toString('hex'),
      publicNonce: Buffer.from(stepOneData.publicNonce).toString('hex'),
      participantKey: stepOneData.participantKey.toString()
    };
  }

  /**
   * Print the hash of a recent block
   * solana-tss recent-block-hash
   */
  async recentBlockHash(): Promise<string> {
    return await this.wallet.getRecentBlockhash();
  }

  /**
   * Step 2 of aggregate signing
   * solana-tss agg-send-step-two <step_one_data> <participant_secret> <to> <amount> <network> <all_public_nonces> [memo] [recent_block_hash]
   */
  async aggregateSignStepTwo(
    stepOneDataJson: string,
    participantSecretHex: string,
    to: string,
    amount: number,
    allPublicNoncesHex: string[],
    memo?: string,
    recentBlockhash?: string
  ): Promise<{
    partialSignature: string;
    publicNonce: string;
    participantKey: string;
  }> {
    const stepOneData: AggSignStepOneData = {
      secretNonce: new Uint8Array(Buffer.from(JSON.parse(stepOneDataJson).secretNonce, 'hex')),
      publicNonce: new Uint8Array(Buffer.from(JSON.parse(stepOneDataJson).publicNonce, 'hex')),
      participantKey: TSSWallet.validatePublicKey(JSON.parse(stepOneDataJson).participantKey)
    };

    const participantSecret = new Uint8Array(Buffer.from(participantSecretHex, 'hex'));
    const toPublicKey = TSSWallet.validatePublicKey(to);
    const fromPublicKey = stepOneData.participantKey;

    const blockHash = recentBlockhash || await this.wallet.getRecentBlockhash();

    const transactionDetails: TSSTransactionDetails = {
      amount,
      to: toPublicKey,
      from: fromPublicKey,
      network: this.wallet.getCurrentNetwork(),
      memo,
      recentBlockhash: blockHash
    };

    const allPublicNonces = allPublicNoncesHex.map(hex => 
      new Uint8Array(Buffer.from(hex, 'hex'))
    );

    const stepTwoData = await this.signingService.aggregateSignStepTwo(
      stepOneData,
      participantSecret,
      transactionDetails,
      allPublicNonces
    );

    return {
      partialSignature: Buffer.from(stepTwoData.partialSignature).toString('hex'),
      publicNonce: Buffer.from(stepTwoData.publicNonce).toString('hex'),
      participantKey: stepTwoData.participantKey.toString()
    };
  }

  /**
   * Aggregate all the partial signatures together and send transaction
   * solana-tss aggregate-signatures-and-broadcast <partial_signatures> <transaction_details> <aggregate_wallet>
   */
  async aggregateSignaturesAndBroadcast(
    partialSignaturesJson: string,
    transactionDetailsJson: string,
    aggregateWalletJson: string
  ): Promise<string> {
    const partialSignatures: AggSignStepTwoData[] = JSON.parse(partialSignaturesJson).map((sig: any) => ({
      partialSignature: new Uint8Array(Buffer.from(sig.partialSignature, 'hex')),
      publicNonce: new Uint8Array(Buffer.from(sig.publicNonce, 'hex')),
      participantKey: TSSWallet.validatePublicKey(sig.participantKey)
    }));

    const txDetailsRaw = JSON.parse(transactionDetailsJson);
    const transactionDetails: TSSTransactionDetails = {
      amount: txDetailsRaw.amount,
      to: TSSWallet.validatePublicKey(txDetailsRaw.to),
      from: TSSWallet.validatePublicKey(txDetailsRaw.from),
      network: txDetailsRaw.network,
      memo: txDetailsRaw.memo,
      recentBlockhash: txDetailsRaw.recentBlockhash
    };

    const aggregateWalletRaw = JSON.parse(aggregateWalletJson);
    const aggregateWallet = {
      aggregatedPublicKey: TSSWallet.validatePublicKey(aggregateWalletRaw.aggregatedPublicKey),
      participantKeys: aggregateWalletRaw.participantKeys.map((k: string) => TSSWallet.validatePublicKey(k)),
      threshold: aggregateWalletRaw.threshold
    };

    return await this.signingService.aggregateSignaturesAndBroadcast(
      partialSignatures,
      transactionDetails,
      aggregateWallet
    );
  }

  /**
   * Switch to a different network
   */
  switchNetwork(network: SolanaNetwork): void {
    this.wallet.switchNetwork(network);
    this.signingService = new TSSSigningService(this.wallet.getConnection());
  }

  /**
   * Get current network
   */
  getCurrentNetwork(): SolanaNetwork {
    return this.wallet.getCurrentNetwork();
  }

  /**
   * Format balance for display
   */
  static formatBalance(balance: number): string {
    return `${balance.toFixed(9)} SOL`;
  }

  /**
   * Helper to print help information
   */
  static printHelp(): string {
    return `
Solana TSS Library v1.0.0
A TypeScript library for managing Solana TSS wallets

USAGE:
    Available methods in TSSCli class:

METHODS:
    generate()
            Generate a pair of keys
    balance(address)
            Check the balance of an address
    airdrop(address, amount)
            Request an airdrop from a faucet
    sendSingle(fromSecret, to, amount, memo?)
            Send a transaction using a single private key
    aggregateKeys(keys, threshold?)
            Aggregate a list of addresses into a single address
    aggregateSignStepOne(participantSecret, to, amount, memo?, recentBlockhash?)
            Start aggregate signing
    recentBlockHash()
            Get the hash of a recent block
    aggregateSignStepTwo(stepOneData, participantSecret, to, amount, allPublicNonces, memo?, recentBlockhash?)
            Step 2 of aggregate signing
    aggregateSignaturesAndBroadcast(partialSignatures, transactionDetails, aggregateWallet)
            Aggregate signatures and broadcast transaction

NETWORKS:
    mainnet, devnet, testnet (default: devnet)
    `;
  }
} 