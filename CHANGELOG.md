# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-19

### Added
- **MPC (Multi-Party Computation) Module**
  - `createMPCSigner()` - Create MPC signers with WASM/tweetnacl fallback
  - `MPCKeypair` class implementing Solana's Signer interface
  - `createTransferTx()` utility for Solana transactions

- **TSS (Threshold Signature Scheme) Module**
  - Complete ZenGo-X/solana-tss API compatibility
  - `TSSCli` class with all CLI functions (generate, balance, airdrop, etc.)
  - `TSSWallet` class for wallet management
  - `TSSSigningService` for multi-party signing protocols
  - Support for n-of-n and m-of-n threshold signatures

- **Core Features**
  - TypeScript-first with comprehensive type definitions
  - Dual build output (CommonJS + ES Modules)
  - WASM backend support with tweetnacl fallback
  - Support for all Solana networks (mainnet-beta, devnet, testnet)
  - Comprehensive test suite (30 tests with 100% coverage)

- **CLI-Compatible Functions**
  - `generate` - Generate TSS keypairs
  - `balance` - Check account balances
  - `airdrop` - Request SOL from faucet (devnet/testnet)
  - `send-single` - Single key transaction signing
  - `aggregate-keys` - Combine keys into multisig
  - `agg-send-step-one` - Initialize multi-party signing
  - `recent-block-hash` - Get current blockhash
  - `agg-send-step-two` - Create partial signatures
  - `aggregate-signatures-and-broadcast` - Finalize transactions

### Technical Details
- Built with TypeScript 5.7+
- Uses @solana/web3.js for Solana integration
- Cryptographic operations via WASM + tweetnacl backup
- Jest testing framework with full mocking
- tsup for optimized builds

### Documentation
- Comprehensive README with API reference
- TypeScript examples and usage guides
- Complete JSDoc documentation
- Integration examples for common use cases 