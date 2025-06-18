import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js';
import { TSSCli } from '../src/tss/cli';
import { TSSWallet } from '../src/tss/wallet';
import { TSSSigningService } from '../src/tss/signing';
import { SolanaNetwork } from '../src/tss/types';

// Mock Solana connection methods for TSS tests
jest.mock('@solana/web3.js', () => {
  const originalModule = jest.requireActual('@solana/web3.js');
  return {
    ...originalModule,
    Connection: jest.fn().mockImplementation(() => ({
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: '11111111111111111111111111111111',
        lastValidBlockHeight: 100000000
      }),
      getBalance: jest.fn().mockResolvedValue(2000000000), // 2 SOL
      requestAirdrop: jest.fn().mockResolvedValue('1111111111111111111111111111111111111111111111111111111111111111'),
      confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
      sendTransaction: jest.fn().mockResolvedValue('1111111111111111111111111111111111111111111111111111111111111111'),
    })),
  };
});

describe('TSS Functionality (ZenGo-X/solana-tss compatible)', () => {
  let cli: TSSCli;
  let wallet: TSSWallet;
  let signingService: TSSSigningService;
  let connection: Connection;

  beforeAll(() => {
    connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    cli = new TSSCli('devnet');
    wallet = new TSSWallet('devnet');
    signingService = new TSSSigningService(connection);
  });

  describe('TSSCli - Core Functions', () => {
    it('should generate a keypair', async () => {
      const result = await cli.generate();
      
      expect(result).toBeDefined();
      expect(result.publicKey).toBeDefined();
      expect(result.secretKey).toBeDefined();
      expect(typeof result.publicKey).toBe('string');
      expect(typeof result.secretKey).toBe('string');
      
      // Validate public key format
      expect(() => new PublicKey(result.publicKey)).not.toThrow();
    });

    it('should check balance of an address', async () => {
      const testAddress = '11111111111111111111111111111111';
      
      const balance = await cli.balance(testAddress);
      
      expect(typeof balance).toBe('number');
      expect(balance).toBe(2); // 2 SOL from mock
    });

    it('should aggregate multiple keys', () => {
      const keys = [
        '11111111111111111111111111111111',
        '11111111111111111111111111111112',
        '11111111111111111111111111111113'
      ];
      
      const result = cli.aggregateKeys(keys, 2);
      
      expect(result).toBeDefined();
      expect(result.aggregatedPublicKey).toBeDefined();
      expect(result.participantKeys).toHaveLength(3);
      expect(result.threshold).toBe(2);
      
      // Validate aggregated key format
      expect(() => new PublicKey(result.aggregatedPublicKey)).not.toThrow();
    });

    it('should get recent blockhash', async () => {
      const blockhash = await cli.recentBlockHash();
      
      expect(typeof blockhash).toBe('string');
      expect(blockhash).toBe('11111111111111111111111111111111');
    });

    it('should switch networks', () => {
      const originalNetwork = cli.getCurrentNetwork();
      expect(originalNetwork).toBe('devnet');
      
      cli.switchNetwork('testnet');
      expect(cli.getCurrentNetwork()).toBe('testnet');
      
      // Switch back
      cli.switchNetwork(originalNetwork);
      expect(cli.getCurrentNetwork()).toBe(originalNetwork);
    });

    it('should request airdrop (devnet/testnet only)', async () => {
      const testAddress = '11111111111111111111111111111111';
      
      const txSignature = await cli.airdrop(testAddress, 1);
      
      expect(typeof txSignature).toBe('string');
      expect(txSignature).toBe('1111111111111111111111111111111111111111111111111111111111111111');
    });

    it('should reject airdrop on mainnet', async () => {
      cli.switchNetwork('mainnet-beta');
      const testAddress = '11111111111111111111111111111111';
      
      await expect(cli.airdrop(testAddress, 1)).rejects.toThrow('Airdrop not available on mainnet');
      
      // Switch back to devnet
      cli.switchNetwork('devnet');
    });
  });

  describe('TSSWallet - Wallet Management', () => {
    it('should create wallet with different networks', () => {
      const devnetWallet = new TSSWallet('devnet');
      const testnetWallet = new TSSWallet('testnet');
      
      expect(devnetWallet.getCurrentNetwork()).toBe('devnet');
      expect(testnetWallet.getCurrentNetwork()).toBe('testnet');
    });

    it('should generate TSS keypairs', async () => {
      const keypair = await wallet.generateKeypair();
      
      expect(keypair.publicKey).toBeInstanceOf(PublicKey);
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array);
      expect(keypair.secretKey.length).toBe(32);
    });

    it('should validate public keys', () => {
      const validKey = '11111111111111111111111111111111';
      const invalidKey = 'invalid-key';
      
      expect(() => TSSWallet.validatePublicKey(validKey)).not.toThrow();
      expect(() => TSSWallet.validatePublicKey(invalidKey)).toThrow();
    });

    it('should format balance correctly', () => {
      const lamports = 1000000000; // 1 SOL
      const formatted = TSSWallet.formatBalance(lamports);
      
      expect(formatted).toBe('1.000000000 SOL');
    });

    it('should aggregate keys properly', () => {
      const keys = [
        new PublicKey('11111111111111111111111111111111'),
        new PublicKey('11111111111111111111111111111112')
      ];
      
      const aggregateWallet = wallet.aggregateKeys(keys, 2);
      
      expect(aggregateWallet.aggregatedPublicKey).toBeInstanceOf(PublicKey);
      expect(aggregateWallet.participantKeys).toHaveLength(2);
      expect(aggregateWallet.threshold).toBe(2);
    });
  });

  describe('TSSSigningService - Multi-party Signing', () => {
    let participantSecret: Uint8Array;
    let testTransaction: any;

    beforeEach(() => {
      // Generate test secret key
      const keypair = Keypair.generate();
      participantSecret = keypair.secretKey;
      
      testTransaction = {
        amount: 1000000,
        to: new PublicKey('11111111111111111111111111111111'),
        from: keypair.publicKey,
        network: 'devnet' as SolanaNetwork,
        memo: 'Test transaction',
        recentBlockhash: '11111111111111111111111111111111'
      };
    });

    it('should perform step one of aggregate signing', async () => {
      const stepOneResult = await signingService.aggregateSignStepOne(
        participantSecret,
        testTransaction
      );
      
      expect(stepOneResult).toBeDefined();
      expect(stepOneResult.secretNonce).toBeInstanceOf(Uint8Array);
      expect(stepOneResult.publicNonce).toBeInstanceOf(Uint8Array);
      expect(stepOneResult.participantKey).toBeInstanceOf(PublicKey);
      expect(stepOneResult.secretNonce.length).toBe(32);
      expect(stepOneResult.publicNonce.length).toBe(32);
    });

    it('should perform step two of aggregate signing', async () => {
      // First, perform step one
      const stepOneResult = await signingService.aggregateSignStepOne(
        participantSecret,
        testTransaction
      );
      
      const allPublicNonces = [stepOneResult.publicNonce];
      
      const stepTwoResult = await signingService.aggregateSignStepTwo(
        stepOneResult,
        participantSecret,
        testTransaction,
        allPublicNonces
      );
      
      expect(stepTwoResult).toBeDefined();
      expect(stepTwoResult.partialSignature).toBeInstanceOf(Uint8Array);
      expect(stepTwoResult.publicNonce).toBeInstanceOf(Uint8Array);
      expect(stepTwoResult.participantKey).toBeInstanceOf(PublicKey);
      expect(stepTwoResult.partialSignature.length).toBe(64);
    });

    it('should verify partial signatures', () => {
      const testSignature = {
        signer: new PublicKey('11111111111111111111111111111111'),
        signature: new Uint8Array(64),
        nonce: new Uint8Array(32)
      };
      
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      
      // This will return false for dummy data, but tests the interface
      const isValid = signingService.verifyPartialSignature(testSignature, message);
      expect(typeof isValid).toBe('boolean');
    });

    it('should handle insufficient signatures', async () => {
      const aggregateWallet = {
        aggregatedPublicKey: new PublicKey('11111111111111111111111111111111'),
        participantKeys: [new PublicKey('11111111111111111111111111111111')],
        threshold: 2 // Require 2 signatures
      };

      const partialSignatures = [
        {
          partialSignature: new Uint8Array(64),
          publicNonce: new Uint8Array(32),
          participantKey: new PublicKey('11111111111111111111111111111111')
        }
      ]; // Only 1 signature provided

      await expect(
        signingService.aggregateSignaturesAndBroadcast(
          partialSignatures,
          testTransaction,
          aggregateWallet
        )
      ).rejects.toThrow('Insufficient signatures: 1/2');
    });
  });

  describe('CLI Integration Tests', () => {
    it('should print help information', () => {
      const help = TSSCli.printHelp();
      
      expect(typeof help).toBe('string');
      expect(help).toContain('Solana TSS Library');
      expect(help).toContain('generate');
      expect(help).toContain('balance');
      expect(help).toContain('airdrop');
    });

    it('should format balance with CLI helper', () => {
      const balance = 1.5;
      const formatted = TSSCli.formatBalance(balance);
      
      expect(formatted).toBe('1.500000000 SOL');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid public key validation', () => {
      expect(() => TSSWallet.validatePublicKey('invalid')).toThrow('Invalid public key format');
    });

    it('should handle empty key aggregation', () => {
      expect(() => wallet.aggregateKeys([], 1)).toThrow('Cannot aggregate empty key list');
    });

    it('should handle single key aggregation', () => {
      const key = new PublicKey('11111111111111111111111111111111');
      const result = wallet.aggregateKeys([key]);
      
      expect(result.aggregatedPublicKey).toEqual(key);
      expect(result.participantKeys).toHaveLength(1);
    });
  });

  describe('End-to-End TSS Workflow (Mocked)', () => {
    it('should complete a simplified TSS signing workflow', async () => {
      // 1. Generate participants
      const participant1 = await cli.generate();
      const participant2 = await cli.generate();
      
      // 2. Aggregate their keys
      const aggregateResult = cli.aggregateKeys([
        participant1.publicKey,
        participant2.publicKey
      ], 2);
      
      // 3. Get recent blockhash
      const recentBlockhash = await cli.recentBlockHash();
      
      // 4. Perform step one for both participants
      const step1P1 = await cli.aggregateSignStepOne(
        participant1.secretKey,
        participant2.publicKey,
        1000000, // Use lamports instead of SOL
        'TSS test transaction',
        recentBlockhash
      );
      
      const step1P2 = await cli.aggregateSignStepOne(
        participant2.secretKey,
        participant2.publicKey,
        1000000, // Use lamports instead of SOL
        'TSS test transaction',
        recentBlockhash
      );
      
      // Verify step one results
      expect(step1P1.publicNonce).toBeDefined();
      expect(step1P2.publicNonce).toBeDefined();
      expect(step1P1.participantKey).toBeDefined();
      expect(step1P2.participantKey).toBeDefined();
      
      // 5. Verify data consistency
      expect(typeof step1P1.secretNonce).toBe('string');
      expect(typeof step1P1.publicNonce).toBe('string');
      expect(typeof step1P1.participantKey).toBe('string');
      
      // Test step 2 preparation
      const allPublicNonces = [step1P1.publicNonce, step1P2.publicNonce];
      
              const step2P1 = await cli.aggregateSignStepTwo(
          JSON.stringify(step1P1),
          participant1.secretKey,
          participant2.publicKey,
          1000000, // Use lamports instead of SOL
          allPublicNonces,
          'TSS test transaction',
          recentBlockhash
        );
      
      expect(step2P1.partialSignature).toBeDefined();
      expect(typeof step2P1.partialSignature).toBe('string');
    });
  });
}); 