import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { createMPCSigner } from '../src/mpc/ed25519';
import { MPCKeypair } from '../src/mpc/MPCKeypair';
import { createTransferTx } from '../src/solana/tx';

describe('MPC Signing Library', () => {
  let connection: Connection;

  beforeAll(() => {
    connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  });

  describe('MPCSigner', () => {
    it('should create an MPC signer', async () => {
      const signer = await createMPCSigner();
      
      expect(signer).toBeDefined();
      expect(signer.publicKey).toBeInstanceOf(PublicKey);
      expect(typeof signer.sign).toBe('function');
    });

    it('should sign data', async () => {
      const signer = await createMPCSigner();
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      
      const signature = await signer.sign(message);
      
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('MPCKeypair', () => {
    it('should create an MPCKeypair from MPCSigner', async () => {
      const signer = await createMPCSigner();
      const keypair = new MPCKeypair(signer);
      
      expect(keypair.publicKey).toEqual(signer.publicKey);
    });

    it('should sign a transaction', async () => {
      const signer = await createMPCSigner();
      const keypair = new MPCKeypair(signer);
      
      const tx = await createTransferTx(
        connection,
        keypair.publicKey,
        new PublicKey('11111111111111111111111111111111'),
        1000000 // 0.001 SOL
      );

      const signedTx = await keypair.signTransaction(tx);
      
      expect(signedTx).toBeDefined();
      expect(signedTx.signatures.length).toBeGreaterThan(0);
    });

    it('should sign multiple transactions', async () => {
      const signer = await createMPCSigner();
      const keypair = new MPCKeypair(signer);
      
      const tx1 = await createTransferTx(
        connection,
        keypair.publicKey,
        new PublicKey('11111111111111111111111111111111'),
        1000000
      );
      
      const tx2 = await createTransferTx(
        connection,
        keypair.publicKey,
        new PublicKey('11111111111111111111111111111111'),
        2000000
      );

      const signedTxs = await keypair.signAllTransactions([tx1, tx2]);
      
      expect(signedTxs).toHaveLength(2);
      expect(signedTxs[0].signatures.length).toBeGreaterThan(0);
      expect(signedTxs[1].signatures.length).toBeGreaterThan(0);
    });
  });

  describe('Solana Transactions', () => {
    it('should create a transfer transaction', async () => {
      const fromPubkey = new PublicKey('11111111111111111111111111111111');
      const toPubkey = new PublicKey('11111111111111111111111111111112');
      
      const tx = await createTransferTx(connection, fromPubkey, toPubkey, 1000000);
      
      expect(tx).toBeDefined();
      expect(tx.instructions).toHaveLength(1);
      expect(tx.feePayer).toEqual(fromPubkey);
    });
  });
}); 