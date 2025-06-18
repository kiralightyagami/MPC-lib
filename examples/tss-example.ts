#!/usr/bin/env node

/**
 * Example usage of the Solana TSS Library
 * Demonstrates all functions equivalent to the original ZenGo-X/solana-tss CLI
 */

import { TSSCli, TSSWallet, TSSSigningService, SolanaNetwork } from '../src';

async function demonstrateTSSFunctionality() {
  console.log('🚀 Solana TSS Library Demo');
  console.log('==========================\n');

  // Initialize TSS CLI with devnet
  const cli = new TSSCli('devnet');
  
  try {
    // 1. Generate keypairs (equivalent to: solana-tss generate)
    console.log('1. Generating keypairs...');
    const participant1 = await cli.generate();
    const participant2 = await cli.generate();
    
    console.log(`   Participant 1 Public Key: ${participant1.publicKey}`);
    console.log(`   Participant 2 Public Key: ${participant2.publicKey}\n`);

    // 2. Check balance (equivalent to: solana-tss balance <address>)
    console.log('2. Checking balances...');
    const balance1 = await cli.balance(participant1.publicKey);
    const balance2 = await cli.balance(participant2.publicKey);
    
    console.log(`   Participant 1 Balance: ${TSSCli.formatBalance(balance1)}`);
    console.log(`   Participant 2 Balance: ${TSSCli.formatBalance(balance2)}\n`);

    // 3. Request airdrop if needed (equivalent to: solana-tss airdrop <address> <amount>)
    if (balance1 === 0) {
      console.log('3. Requesting airdrop for participant 1...');
      try {
        const airdropTx = await cli.airdrop(participant1.publicKey, 1);
        console.log(`   Airdrop transaction: ${airdropTx}\n`);
      } catch (error) {
        console.log(`   Airdrop failed (expected on mainnet): ${error}\n`);
      }
    }

    // 4. Aggregate keys (equivalent to: solana-tss aggregate-keys <key1> <key2>)
    console.log('4. Aggregating public keys...');
    const aggregateResult = cli.aggregateKeys([
      participant1.publicKey,
      participant2.publicKey
    ], 2); // 2-of-2 threshold
    
    console.log(`   Aggregated Public Key: ${aggregateResult.aggregatedPublicKey}`);
    console.log(`   Threshold: ${aggregateResult.threshold}/${aggregateResult.participantKeys.length}\n`);

    // 5. Get recent blockhash (equivalent to: solana-tss recent-block-hash)
    console.log('5. Getting recent blockhash...');
    const recentBlockhash = await cli.recentBlockHash();
    console.log(`   Recent Blockhash: ${recentBlockhash}\n`);

    // 6. Demonstrate single key signing (equivalent to: solana-tss send-single)
    console.log('6. Single key signing (non-TSS)...');
    try {
      const recipient = participant2.publicKey;
      const txId = await cli.sendSingle(
        participant1.secretKey,
        recipient,
        0.001, // 0.001 SOL
        'Single signature test'
      );
      console.log(`   Transaction ID: ${txId}\n`);
    } catch (error) {
      console.log(`   Single signing failed (expected without funds): ${error}\n`);
    }

    // 7. TSS Multi-party signing workflow
    console.log('7. TSS Multi-party signing workflow...');
    
    // Step 1: Each participant generates nonce and commitment
    console.log('   Step 1: Generating nonces...');
    const step1P1 = await cli.aggregateSignStepOne(
      participant1.secretKey,
      participant2.publicKey,
      0.001,
      'TSS transaction test',
      recentBlockhash
    );
    
    const step1P2 = await cli.aggregateSignStepOne(
      participant2.secretKey,
      participant2.publicKey,
      0.001,
      'TSS transaction test',
      recentBlockhash
    );
    
    console.log(`   Participant 1 Public Nonce: ${step1P1.publicNonce.substring(0, 16)}...`);
    console.log(`   Participant 2 Public Nonce: ${step1P2.publicNonce.substring(0, 16)}...`);

    // Step 2: Each participant creates partial signature
    console.log('   Step 2: Creating partial signatures...');
    const allPublicNonces = [step1P1.publicNonce, step1P2.publicNonce];
    
    const step2P1 = await cli.aggregateSignStepTwo(
      JSON.stringify(step1P1),
      participant1.secretKey,
      participant2.publicKey,
      0.001,
      allPublicNonces,
      'TSS transaction test',
      recentBlockhash
    );
    
    const step2P2 = await cli.aggregateSignStepTwo(
      JSON.stringify(step1P2),
      participant2.secretKey,
      participant2.publicKey,
      0.001,
      allPublicNonces,
      'TSS transaction test',
      recentBlockhash
    );
    
    console.log(`   Participant 1 Partial Signature: ${step2P1.partialSignature.substring(0, 16)}...`);
    console.log(`   Participant 2 Partial Signature: ${step2P2.partialSignature.substring(0, 16)}...`);

    // Step 3: Aggregate signatures and broadcast
    console.log('   Step 3: Aggregating signatures and broadcasting...');
    try {
      const partialSignatures = JSON.stringify([step2P1, step2P2]);
      const transactionDetails = JSON.stringify({
        amount: 0.001,
        to: participant2.publicKey,
        from: aggregateResult.aggregatedPublicKey,
        network: 'devnet',
        memo: 'TSS transaction test',
        recentBlockhash
      });
      const aggregateWallet = JSON.stringify(aggregateResult);
      
      const finalTxId = await cli.aggregateSignaturesAndBroadcast(
        partialSignatures,
        transactionDetails,
        aggregateWallet
      );
      console.log(`   Final Transaction ID: ${finalTxId}`);
    } catch (error) {
      console.log(`   TSS broadcast failed (expected - simplified TSS): ${error}`);
    }

    console.log('\n✅ TSS Demo completed successfully!');
    
    // 8. Show help
    console.log('\n8. Available CLI functions:');
    console.log(TSSCli.printHelp());

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Additional utility examples
async function demonstrateAdvancedFeatures() {
  console.log('\n🔧 Advanced Features Demo');
  console.log('=========================\n');

  // Network switching
  const cli = new TSSCli('devnet');
  console.log(`Current network: ${cli.getCurrentNetwork()}`);
  
  cli.switchNetwork('testnet');
  console.log(`Switched to: ${cli.getCurrentNetwork()}`);
  
  cli.switchNetwork('devnet');
  console.log(`Back to: ${cli.getCurrentNetwork()}\n`);

  // Direct wallet usage
  const wallet = new TSSWallet('devnet');
  const keypair = await wallet.generateKeypair();
  console.log(`Generated keypair via TSSWallet: ${keypair.publicKey.toString()}`);

  // Format utilities
  const lamports = 1500000000; // 1.5 SOL
  console.log(`Formatted balance: ${TSSWallet.formatBalance(lamports)}`);
}

// Run the demo
if (require.main === module) {
  demonstrateTSSFunctionality()
    .then(() => demonstrateAdvancedFeatures())
    .catch(console.error);
}

export { demonstrateTSSFunctionality, demonstrateAdvancedFeatures }; 