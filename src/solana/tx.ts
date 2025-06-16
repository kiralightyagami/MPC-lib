import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

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


// File: src/mpc/ed25519.ts
// This module wires up a real WASM-based Ed25519 signer (placeholder for TSS logic)
import init, { Keypair, sign as wasmSign } from '../../pkg/ed25519_tss_wasm';
import { PublicKey } from '@solana/web3.js';

/**
 * Initializes the WASM module and generates a new keypair.
 * In a real threshold setup, DKG would split shares instead of a single secret.
 */
export async function createMPCSigner() {
  // Load the WASM module (built via wasm-pack)
  await init();

  // Generate a fresh Ed25519 keypair
  const kp = Keypair.generate();
  const publicKeyBytes = kp.public_key();
  const secretKeyBytes = kp.secret_key();

  const publicKey = new PublicKey(publicKeyBytes);

  return {
    publicKey,
    sign: async (message: Uint8Array) => {
      // In a real MPC you’d collect partial signatures from peers
      // Here we do a direct sign via WASM for demonstration
      const sig = wasmSign(message, secretKeyBytes);
      return sig;
    }
  };
}


/*
Rust WASM Crate (ed25519-tss-wasm)

// Cargo.toml
[package]
name = "ed25519_tss_wasm"
version = "0.1.0"
edition = "2018"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
ed25519-dalek = { version = "1.0.1", default-features = false, features = ["alloc"] }
rand = "0.8"

// src/lib.rs
use wasm_bindgen::prelude::*;
use ed25519_dalek::{Keypair, Signature, Signer};
use rand::rngs::OsRng;

#[wasm_bindgen]
pub struct KeypairWasm {
    kp: Keypair,
}

#[wasm_bindgen]
impl KeypairWasm {
    #[wasm_bindgen]
    pub fn generate() -> KeypairWasm {
        let mut csprng = OsRng;
        let kp = Keypair::generate(&mut csprng);
        KeypairWasm { kp }
    }

    #[wasm_bindgen]
    pub fn public_key(&self) -> Vec<u8> {
        self.kp.public.to_bytes().to_vec()
    }

    #[wasm_bindgen]
    pub fn secret_key(&self) -> Vec<u8> {
        self.kp.secret.to_bytes().to_vec()
    }
}

#[wasm_bindgen]
/// Sign a message with the provided secret key bytes
pub fn sign(message: &[u8], secret_key_bytes: Vec<u8>) -> Vec<u8> {
    let secret = ed25519_dalek::SecretKey::from_bytes(&secret_key_bytes).unwrap();
    let public = ed25519_dalek::PublicKey::from(&secret);
    let kp = Keypair { secret, public };
    let sig: Signature = kp.sign(message);
    sig.to_bytes().to_vec()
}
*/