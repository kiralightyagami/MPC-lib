# 🔐 Solana MPC/TSS Library

[![npm version](https://badge.fury.io/js/solana-mpc-tss-lib.svg)](https://badge.fury.io/js/solana-mpc-tss-lib)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-30%2F30%20✓-green.svg)](#testing)

A comprehensive TypeScript library for Solana Multi-Party Computation (MPC) and Threshold Signature Schemes (TSS), providing seamless integration with the Solana blockchain ecosystem.

## ✨ Features

### 🔑 MPC (Multi-Party Computation) Module
- **Secure Signing**: Advanced cryptographic operations without private key exposure
- **Solana Integration**: Full compatibility with Solana's `Signer` interface
- **WASM Optimization**: High-performance ed25519_tss_wasm with automatic tweetnacl fallback
- **Transaction Utilities**: Ready-to-use functions for common Solana operations

### 🤝 TSS (Threshold Signature Scheme) Module  
- **ZenGo-X Compatible**: 100% API compatibility with ZenGo-X/solana-tss Rust CLI
- **Flexible Thresholds**: Support for n-of-n and m-of-n signature schemes (2-of-3, 3-of-5, etc.)
- **Multi-Network**: Seamless operation across mainnet-beta, devnet, and testnet
- **Production Ready**: Battle-tested cryptographic protocols for enterprise use

## 🚀 Quick Start

### Installation

```bash
npm install solana-mpc-tss-lib
# or
yarn add solana-mpc-tss-lib
```

### Basic Usage

```typescript
import { TSSCli, createMPCSigner, MPCKeypair } from 'solana-mpc-tss-lib';

// Quick MPC signing
const signer = await createMPCSigner();
const keypair = new MPCKeypair(signer);

// TSS operations
const cli = new TSSCli('devnet');
const keypairInfo = await cli.generate();
console.log('Generated:', keypairInfo.publicKey);
```

### Simple Transaction Example

```typescript
import { createMPCSigner, MPCKeypair, createTransferTx } from 'solana-mpc-tss-lib';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('devnet'));
const signer = await createMPCSigner();
const keypair = new MPCKeypair(signer);

// Create and sign transaction
const tx = await createTransferTx(
  connection,
  keypair.publicKey,
  new PublicKey('destination-address'),
  1000000 // 0.001 SOL in lamports
);

const signedTx = await keypair.signTransaction(tx);
const signature = await connection.sendTransaction(signedTx, [keypair]);
```

### Multi-Party Threshold Signing

```typescript
import { TSSCli } from 'solana-mpc-tss-lib';

const cli = new TSSCli('devnet');

// Generate participant keypairs
const participant1 = await cli.generate();
const participant2 = await cli.generate();
const participant3 = await cli.generate();

// Create 2-of-3 multisig
const aggregated = cli.aggregateKeys([
  participant1.publicKey,
  participant2.publicKey,
  participant3.publicKey
], 2);

// Initiate multi-party signing (Step 1 for each participant)
const recentBlockhash = await cli.recentBlockHash();
const step1P1 = await cli.aggregateSignStepOne(
  participant1.secretKey,
  'destination-address',
  1000000,
  'Multi-sig payment', // Optional memo
  recentBlockhash
);

const step1P2 = await cli.aggregateSignStepOne(
  participant2.secretKey,
  'destination-address',
  1000000,
  'Multi-sig payment',
  recentBlockhash
);

// Step 2: Create partial signatures
const allPublicNonces = [step1P1.publicNonce, step1P2.publicNonce];
const step2P1 = await cli.aggregateSignStepTwo(
  JSON.stringify(step1P1),
  participant1.secretKey,
  'destination-address',
  1000000,
  allPublicNonces,
  'Multi-sig payment',
  recentBlockhash
);

const step2P2 = await cli.aggregateSignStepTwo(
  JSON.stringify(step1P2),
  participant2.secretKey,
  'destination-address',
  1000000,
  allPublicNonces,
  'Multi-sig payment',
  recentBlockhash
);

// Step 3: Aggregate signatures and broadcast
const partialSignatures = [step2P1, step2P2];
const transactionDetails = {
  amount: 1000000,
  to: 'destination-address',
  from: aggregated.aggregatedPublicKey, // Use the aggregated public key
  network: 'devnet',
  memo: 'Multi-sig payment',
  recentBlockhash
};

const signature = await cli.aggregateSignaturesAndBroadcast(
  JSON.stringify(partialSignatures),
  JSON.stringify(transactionDetails),
  JSON.stringify(aggregated) // Pass the aggregated wallet info here
);
```

## 📖 API Reference

### Core Classes

#### `TSSCli`
Main interface for TSS operations, compatible with ZenGo-X/solana-tss.

```typescript
const cli = new TSSCli('devnet'); // 'mainnet-beta' | 'devnet' | 'testnet'

// Wallet operations
await cli.generate()                    // Generate keypair
await cli.balance(address)              // Check balance
await cli.airdrop(address, amount)      // Request SOL (devnet/testnet)

// Transaction operations  
await cli.sendSingle(secret, to, amount, memo)  // Single-party transaction
cli.aggregateKeys(keys, threshold)              // Create multisig

// Multi-party signing workflow
await cli.aggregateSignStepOne(...)     // Initialize signing
await cli.aggregateSignStepTwo(...)     // Create partial signature
await cli.aggregateSignaturesAndBroadcast(...) // Finalize transaction
```

#### `MPCKeypair`
Implements Solana's `Signer` interface with MPC backend.

```typescript
const signer = await createMPCSigner();
const keypair = new MPCKeypair(signer);

await keypair.signTransaction(tx)       // Sign single transaction
await keypair.signAllTransactions(txs)  // Sign multiple transactions
```

#### `TSSWallet`
Wallet management and key aggregation utilities.

```typescript
const wallet = new TSSWallet('devnet');

await wallet.generateKeypair()          // Generate TSS keypair
await wallet.getBalance(publicKey)      // Check balance
wallet.aggregateKeys(keys, threshold)   // Create aggregate wallet
```

### Utility Functions

```typescript
// MPC operations
createMPCSigner()                       // Create new MPC signer
createMPCSignerFromSecretKey(bytes)     // From existing secret

// Solana utilities
createTransferTx(connection, from, to, amount)  // Create transfer transaction
```

## 🔧 TypeScript Types

The library includes comprehensive TypeScript definitions:

```typescript
// Core interfaces
interface MPCSigner {
  publicKey: PublicKey;
  sign(data: Uint8Array): Promise<Uint8Array>;
}

interface TSSKeypair {
  publicKey: PublicKey;
  secretKey: Uint8Array;
}

// Network types
type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';

// TSS workflow types
interface StepOneData {
  secretNonce: string;
  publicNonce: string;
  participantKey: string;
}

interface PartialSignature {
  partialSignature: string;
  publicNonce: string;
  participantKey: string;
}
```

## 🧪 Testing

The library includes comprehensive test coverage:

```bash
npm test                    # Run all tests (30 tests)
npm run test:watch          # Watch mode
npm run test:usage          # Test built library
```

**Test Coverage:**
- ✅ MPC signing operations (12 tests)
- ✅ TSS workflow end-to-end (18 tests)  
- ✅ Error handling and edge cases
- ✅ Network integration (mocked)
- ✅ TypeScript compilation

## 🏗️ Building & Development

```bash
# Clone and setup
git clone https://github.com/kiralightyagami/solana-mpc-tss.git
cd solana-mpc-tss
npm install

# Development commands
npm run build               # Build CJS + ESM + types
npm run dev                 # Watch mode build
npm test                    # Run tests
npm run typecheck           # TypeScript validation
npm run example             # Run example code
```

## 🔒 Security Features

- **No Private Key Exposure**: MPC protocols ensure keys never exist in plaintext
- **Threshold Security**: Configurable m-of-n signature requirements
- **Network Isolation**: Separate configurations for different Solana networks
- **Fallback Mechanisms**: Automatic fallback from WASM to pure JavaScript
- **Type Safety**: Full TypeScript coverage prevents runtime errors

## 🌐 Network Support

| Network | RPC Endpoint | Features |
|---------|-------------|----------|
| **mainnet-beta** | Solana mainnet | Production transactions |
| **devnet** | Solana devnet | Development + airdrops |
| **testnet** | Solana testnet | Testing + airdrops |

## 📚 Documentation

- **[User Guide](./docs/USER_GUIDE.md)** - Comprehensive usage examples
- **[API Documentation](https://kiralightyagami.github.io/solana-mpc-tss/)** - Full API reference
- **[Examples](./examples/)** - Working code examples
- **[Changelog](./CHANGELOG.md)** - Version history

## 🤝 ZenGo-X Compatibility

This library provides 100% API compatibility with [ZenGo-X/solana-tss](https://github.com/ZenGo-X/solana-tss):

| ZenGo-X CLI Command | Library Method | Description |
|---------------------|----------------|-------------|
| `solana-tss generate` | `cli.generate()` | Generate keypair |
| `solana-tss balance` | `cli.balance()` | Check balance |
| `solana-tss airdrop` | `cli.airdrop()` | Request airdrop |
| `solana-tss send-single` | `cli.sendSingle()` | Single-key signing |
| `solana-tss aggregate-keys` | `cli.aggregateKeys()` | Key aggregation |
| `solana-tss agg-send-step-one` | `cli.aggregateSignStepOne()` | Step 1 signing |
| `solana-tss recent-block-hash` | `cli.recentBlockHash()` | Get blockhash |
| `solana-tss agg-send-step-two` | `cli.aggregateSignStepTwo()` | Step 2 signing |
| `solana-tss aggregate-signatures-and-broadcast` | `cli.aggregateSignaturesAndBroadcast()` | Finalize |

## 📦 Package Information

- **Bundle Size**: ~24KB (CJS) / ~22KB (ESM)
- **Dependencies**: @solana/web3.js, tweetnacl
- **Node.js**: >=16.0.0
- **License**: MIT
- **Repository**: [GitHub](https://github.com/kiralightyagami/solana-mpc-tss)

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/kiralightyagami/solana-mpc-tss/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/kiralightyagami/solana-mpc-tss/discussions)
- **Documentation**: [User Guide](./docs/USER_GUIDE.md)

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

<div align="center">
  <strong>Built with ❤️ for the Solana ecosystem</strong>
</div> 
