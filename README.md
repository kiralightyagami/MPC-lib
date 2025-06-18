# Solana MPC Signing Library

A TypeScript library for Multi-Party Computation (MPC) signing on Solana, with WebAssembly (WASM) backend support for Ed25519 cryptography.

## Features

- ✅ **MPC Signer Interface**: Clean abstraction for multi-party signing
- ✅ **Solana Integration**: Drop-in replacement for standard Solana signers  
- ✅ **WASM Backend**: High-performance Ed25519 operations via Rust/WASM
- ✅ **TypeScript Support**: Full type safety and IntelliSense
- ✅ **Jest Testing**: Comprehensive test suite included
- ✅ **Modern Build**: ESM/CJS dual build with `tsup`

## Installation

```bash
npm install mpc-lib
```

## Quick Start

```typescript
import { createMPCSigner, MPCKeypair, createTransferTx } from 'mpc-lib';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

// Create connection
const connection = new Connection(clusterApiUrl('devnet'));

// Create MPC signer (initializes WASM)
const mpcSigner = await createMPCSigner();

// Wrap in Solana-compatible keypair
const keypair = new MPCKeypair(mpcSigner);

// Create and sign transaction
const recipient = new PublicKey('...');
const tx = await createTransferTx(
  connection, 
  keypair.publicKey, 
  recipient, 
  1000000 // 0.001 SOL
);

const signedTx = await keypair.signTransaction(tx);
const signature = await connection.sendTransaction(signedTx, [keypair]);
```

## API Reference

### MPCSigner Interface

```typescript
interface MPCSigner {
  publicKey: PublicKey;
  sign(data: Uint8Array): Promise<Uint8Array>;
}
```

### MPCKeypair Class

Implements Solana's `Signer` interface with MPC backend:

```typescript
class MPCKeypair implements Signer {
  constructor(mpcSigner: MPCSigner);
  
  sign(message: Uint8Array): Promise<Uint8Array>;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
}
```

### Ed25519 Functions

```typescript
// Create new MPC signer
async function createMPCSigner(): Promise<MPCSigner>

// Create from existing secret key
async function createMPCSignerFromSecretKey(secretKeyBytes: Uint8Array): Promise<MPCSigner>
```

### Solana Utilities

```typescript
// Create transfer transaction
async function createTransferTx(
  connection: Connection,
  from: PublicKey,
  to: PublicKey,
  lamports: number
): Promise<Transaction>
```

## WASM Backend

This library expects a Rust WASM module at `pkg/ed25519_tss_wasm` built with `wasm-pack`. 

### Expected Rust Implementation

```toml
# Cargo.toml
[package]
name = "ed25519_tss_wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
ed25519-dalek = { version = "1.0.1", default-features = false, features = ["alloc"] }
rand = "0.8"
```

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;
use ed25519_dalek::{Keypair, Signature, Signer};
use rand::rngs::OsRng;

#[wasm_bindgen]
pub struct Keypair {
    inner: ed25519_dalek::Keypair,
}

#[wasm_bindgen]
impl Keypair {
    #[wasm_bindgen]
    pub fn generate() -> Keypair {
        let mut csprng = OsRng;
        let inner = ed25519_dalek::Keypair::generate(&mut csprng);
        Keypair { inner }
    }

    #[wasm_bindgen]
    pub fn public_key(&self) -> Vec<u8> {
        self.inner.public.to_bytes().to_vec()
    }

    #[wasm_bindgen]
    pub fn secret_key(&self) -> Vec<u8> {
        self.inner.secret.to_bytes().to_vec()
    }
}

#[wasm_bindgen]
pub fn sign(message: &[u8], secret_key_bytes: Vec<u8>) -> Vec<u8> {
    let secret = ed25519_dalek::SecretKey::from_bytes(&secret_key_bytes).unwrap();
    let public = ed25519_dalek::PublicKey::from(&secret);
    let keypair = ed25519_dalek::Keypair { secret, public };
    let signature: Signature = keypair.sign(message);
    signature.to_bytes().to_vec()
}
```

### Building WASM

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build the WASM module
wasm-pack build --target bundler --out-dir pkg
```

## Development

```bash
# Install dependencies
npm install

# Build library
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## Testing

The library includes comprehensive Jest tests with WASM mocking:

```bash
npm test                # Run tests once
npm run test:watch      # Watch mode
```

## Architecture

```
src/
├── mpc/
│   ├── Signer.ts       # MPCSigner interface
│   ├── MPCKeypair.ts   # Solana-compatible wrapper
│   └── ed25519.ts      # WASM integration layer
├── solana/
│   └── tx.ts           # Transaction utilities
├── types/
│   └── wasm.d.ts       # WASM TypeScript declarations
└── index.ts            # Public exports

tests/
└── mpc.spec.ts         # Comprehensive test suite

pkg/                    # WASM output (generated)
└── ed25519_tss_wasm/
```

## License

ISC License 