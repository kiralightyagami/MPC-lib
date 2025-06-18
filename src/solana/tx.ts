import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

/**
 * Create a Solana transfer transaction
 * @param connection The Solana connection
 * @param from The sender's public key
 * @param to The recipient's public key  
 * @param lamports The amount to transfer in lamports
 * @returns Promise resolving to a Transaction
 */
export async function createTransferTx(
  connection: Connection,
  from: PublicKey,
  to: PublicKey,
  lamports: number
): Promise<Transaction> {
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: from }).add(
    SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports })
  );
  return tx;
}