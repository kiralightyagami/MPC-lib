import { PublicKey } from "@solana/web3.js";

export interface MPCSigner {
  publicKey: PublicKey;
  sign(data: Uint8Array): Promise<Uint8Array>;
}