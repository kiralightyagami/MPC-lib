# 📚 Solana MPC/TSS Library - User Guide

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

// Create a TSS CLI instance
const cli = new TSSCli('devnet');

// Generate a keypair
const keypair = await cli.generate();
console.log('Public Key:', keypair.publicKey);

// Create an MPC signer
const signer = await createMPCSigner();
const mpcKeypair = new MPCKeypair(signer);
```

## 📖 Core Concepts

### MPC (Multi-Party Computation)
- **Purpose**: Secure key generation and signing without exposing private keys
- **Use Case**: Single-party signing with enhanced security
- **Implementation**: WASM backend with tweetnacl fallback

### TSS (Threshold Signature Schemes)
- **Purpose**: Multi-party signature generation requiring threshold consensus
- **Use Case**: m-of-n multisig scenarios (e.g., 2-of-3, 3-of-5)
- **Implementation**: Compatible with ZenGo-X/solana-tss protocol

## 🔧 API Reference

### MPC Module

#### `createMPCSigner()`
Creates an MPC signer with automatic WASM/tweetnacl fallback.

```typescript
import { createMPCSigner } from 'solana-mpc-tss-lib';

const signer = await createMPCSigner();
const message = new Uint8Array([1, 2, 3]);
const signature = await signer.sign(message);
```

#### `MPCKeypair`
Implements Solana's `Signer` interface for transaction signing.

```typescript
import { MPCKeypair } from 'solana-mpc-tss-lib';

const signer = await createMPCSigner();
const keypair = new MPCKeypair(signer);

// Sign a transaction
const signedTx = await keypair.signTransaction(transaction);

// Sign multiple transactions
const signedTxs = await keypair.signAllTransactions([tx1, tx2]);
```

### TSS Module

#### `TSSCli`
Main interface for TSS operations, compatible with ZenGo-X/solana-tss CLI.

```typescript
import { TSSCli } from 'solana-mpc-tss-lib';

const cli = new TSSCli('devnet'); // or 'testnet', 'mainnet-beta'

// Generate keypair
const keypair = await cli.generate();

// Check balance
const balance = await cli.balance(publicKeyString);

// Request airdrop (devnet/testnet only)
const txSignature = await cli.airdrop(publicKeyString, 1); // 1 SOL

// Switch networks
cli.switchNetwork('testnet');
```

#### `TSSWallet`
Wallet management and key aggregation.

```typescript
import { TSSWallet } from 'solana-mpc-tss-lib';

const wallet = new TSSWallet('devnet');

// Generate TSS keypair
const keypair = await wallet.generateKeypair();

// Aggregate multiple keys
const publicKeys = [key1, key2, key3];
const aggregateWallet = wallet.aggregateKeys(publicKeys, 2); // 2-of-3 threshold
```

#### `TSSSigningService`
Multi-party signing protocol implementation.

```typescript
import { TSSSigningService } from 'solana-mpc-tss-lib';

const signingService = new TSSSigningService(connection);

// Step 1: Initialize signing
const stepOne = await signingService.aggregateSignStepOne(
  participantSecret,
  transactionDetails
);

// Step 2: Create partial signature
const stepTwo = await signingService.aggregateSignStepTwo(
  stepOne,
  participantSecret,
  transactionDetails,
  allPublicNonces
);

// Step 3: Aggregate and broadcast
const txSignature = await signingService.aggregateSignaturesAndBroadcast(
  partialSignatures,
  transactionDetails,
  aggregateWallet
);
```

## 💡 Common Use Cases

### 1. Simple Transaction Signing

```typescript
import { createMPCSigner, MPCKeypair, createTransferTx } from 'solana-mpc-tss-lib';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('devnet'));
const signer = await createMPCSigner();
const keypair = new MPCKeypair(signer);

// Create transfer transaction
const tx = await createTransferTx(
  connection,
  keypair.publicKey,
  new PublicKey('destination-address'),
  1000000 // 0.001 SOL in lamports
);

// Sign and send
const signedTx = await keypair.signTransaction(tx);
const signature = await connection.sendTransaction(signedTx, [keypair]);
```

### 2. Multi-Party Threshold Signing

```typescript
import { TSSCli } from 'solana-mpc-tss-lib';

const cli = new TSSCli('devnet');

// Each participant generates their keypair
const participant1 = await cli.generate();
const participant2 = await cli.generate();
const participant3 = await cli.generate();

// Aggregate keys for 2-of-3 multisig
const aggregated = cli.aggregateKeys([
  participant1.publicKey,
  participant2.publicKey,
  participant3.publicKey
], 2);

// Get recent blockhash
const recentBlockhash = await cli.recentBlockHash();

// Step 1: Each participant starts signing process
const step1P1 = await cli.aggregateSignStepOne(
  participant1.secretKey,
  'destination-address',
  1000000, // lamports
  'Payment for services',
  recentBlockhash
);

const step1P2 = await cli.aggregateSignStepOne(
  participant2.secretKey,
  'destination-address',
  1000000,
  'Payment for services',
  recentBlockhash
);

// Step 2: Create partial signatures
const allNonces = [step1P1.publicNonce, step1P2.publicNonce];

const step2P1 = await cli.aggregateSignStepTwo(
  JSON.stringify(step1P1),
  participant1.secretKey,
  'destination-address',
  1000000,
  allNonces,
  'Payment for services',
  recentBlockhash
);

const step2P2 = await cli.aggregateSignStepTwo(
  JSON.stringify(step1P2),
  participant2.secretKey,
  'destination-address',
  1000000,
  allNonces,
  'Payment for services',
  recentBlockhash
);

// Step 3: Aggregate signatures and broadcast
const finalSignature = await cli.aggregateSignaturesAndBroadcast(
  [step2P1, step2P2],
  {
    from: aggregated.aggregatedPublicKey,
    to: 'destination-address',
    amount: 1000000,
    network: 'devnet',
    memo: 'Payment for services',
    recentBlockhash
  },
  aggregated
);
```

### 3. Wallet Integration

```typescript
import { TSSWallet, TSSCli } from 'solana-mpc-tss-lib';

// Create wallet
const wallet = new TSSWallet('devnet');
const cli = new TSSCli('devnet');

// Generate user keypair
const userKeypair = await wallet.generateKeypair();

// Check balance
const balance = await cli.balance(userKeypair.publicKey.toString());
console.log(`Balance: ${TSSCli.formatBalance(balance)}`);

// Request airdrop if on devnet/testnet
if (wallet.getCurrentNetwork() !== 'mainnet-beta') {
  const airdropTx = await cli.airdrop(userKeypair.publicKey.toString(), 1);
  console.log('Airdrop transaction:', airdropTx);
}
```

## 🔒 Security Best Practices

### 1. Secret Key Management
```typescript
// ✅ Good: Use environment variables
const secretKey = process.env.SECRET_KEY;

// ❌ Bad: Hardcode secrets
const secretKey = "your-secret-key-here";
```

### 2. Network Selection
```typescript
// ✅ Good: Use appropriate network for environment
const network = process.env.NODE_ENV === 'production' ? 'mainnet-beta' : 'devnet';
const cli = new TSSCli(network);

// ✅ Good: Validate before mainnet operations
if (network === 'mainnet-beta') {
  console.warn('Operating on mainnet - double check all parameters!');
}
```

### 3. Transaction Validation
```typescript
// ✅ Good: Validate transaction before signing
const tx = await createTransferTx(connection, from, to, amount);
console.log('Transaction details:', {
  from: tx.feePayer?.toString(),
  instructions: tx.instructions.length,
  signatures: tx.signatures.length
});

// Confirm before signing
const signedTx = await keypair.signTransaction(tx);
```

## 🛠️ Development Setup

### Building from Source

```bash
git clone https://github.com/kiralightyagami/solana-mpc-tss.git
cd solana-mpc-tss
npm install
npm run build
npm test
```

### Available Scripts

- `npm run build` - Build CJS + ESM + types
- `npm test` - Run test suite
- `npm run test:watch` - Watch mode testing
- `npm run test:usage` - Test built library
- `npm run typecheck` - TypeScript validation
- `npm run example` - Run TSS example

## 🐛 Troubleshooting

### Common Issues

#### WASM Module Not Found
```
WASM module not found, falling back to tweetnacl
```
**Solution**: This is expected behavior. The library automatically falls back to tweetnacl when WASM is unavailable.

#### Network Connection Errors
```
Failed to connect to Solana RPC
```
**Solution**: 
- Check network connectivity
- Verify RPC endpoint is accessible
- Consider using different RPC providers for production

#### Insufficient Balance for Transaction
```
Transaction failed: insufficient funds
```
**Solution**:
- Check account balance with `cli.balance()`
- Request airdrop on devnet/testnet with `cli.airdrop()`
- Ensure transaction amount includes network fees

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/kiralightyagami/solana-mpc-tss/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kiralightyagami/solana-mpc-tss/discussions)
- **Documentation**: [Full API Docs](https://kiralightyagami.github.io/solana-mpc-tss/)

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details. 
