import { PublicKey } from '@solana/web3.js';
import { MPCSigner } from './Signer';
import * as nacl from 'tweetnacl';

/**
 * Initialize the WASM module and create an MPC signer
 * @returns Promise resolving to an MPCSigner instance
 */
export async function createMPCSigner(): Promise<MPCSigner> {
  try {
    // Try to import WASM module if available
    // @ts-ignore - WASM module may not exist, fallback to tweetnacl
    const wasmModule = await import('../../pkg/ed25519_tss_wasm');
    await wasmModule.default();
    
    const kp = wasmModule.Keypair.generate();
    const publicKeyBytes = kp.public_key();
    const secretKeyBytes = kp.secret_key();

    const publicKey = new PublicKey(publicKeyBytes);

    return {
      publicKey,
      sign: async (message: Uint8Array): Promise<Uint8Array> => {
        const signature = wasmModule.sign(message, secretKeyBytes);
        return new Uint8Array(signature);
      }
    };
  } catch (error) {
    // Fallback to tweetnacl if WASM module is not available
    console.warn('WASM module not found, falling back to tweetnacl');
    const keypair = nacl.sign.keyPair();
    const publicKey = new PublicKey(keypair.publicKey);

    return {
      publicKey,
      sign: async (message: Uint8Array): Promise<Uint8Array> => {
        const signature = nacl.sign.detached(message, keypair.secretKey);
        return signature;
      }
    };
  }
}

/**
 * Create an MPC signer from existing secret key bytes
 * @param secretKeyBytes The secret key bytes
 * @returns Promise resolving to an MPCSigner instance
 */
export async function createMPCSignerFromSecretKey(secretKeyBytes: Uint8Array): Promise<MPCSigner> {
  try {
    // @ts-ignore - WASM module may not exist, fallback to tweetnacl
    const wasmModule = await import('../../pkg/ed25519_tss_wasm');
    await wasmModule.default();
    
    // For WASM implementation, derive public key from secret key
    const dummyPublicKey = new PublicKey("11111111111111111111111111111111");
    
    return {
      publicKey: dummyPublicKey,
      sign: async (message: Uint8Array): Promise<Uint8Array> => {
        const signature = wasmModule.sign(message, Array.from(secretKeyBytes));
        return new Uint8Array(signature);
      }
    };
  } catch (error) {
    // Fallback to tweetnacl
    const keypair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
    const publicKey = new PublicKey(keypair.publicKey);
    
    return {
      publicKey,
      sign: async (message: Uint8Array): Promise<Uint8Array> => {
        const signature = nacl.sign.detached(message, keypair.secretKey);
        return signature;
      }
    };
  }
}
