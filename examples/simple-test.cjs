const { TSSCli, TSSWallet, createMPCSigner } = require('../dist/index.cjs');

async function testLibrary() {
  console.log('🧪 Testing MPC/TSS Library Usage\n');
  
  try {
    // Test 1: Basic TSS CLI
    console.log('1. Testing TSS CLI...');
    const cli = new TSSCli('devnet');
    console.log(`   ✅ Created TSS CLI for ${cli.getCurrentNetwork()}`);
    
    // Test 2: Generate keypair
    console.log('2. Testing keypair generation...');
    const keypair = await cli.generate();
    console.log(`   ✅ Generated keypair: ${keypair.publicKey.substring(0, 16)}...`);
    
    // Test 3: Test key aggregation
    console.log('3. Testing key aggregation...');
    const keypair2 = await cli.generate();
    const aggregated = cli.aggregateKeys([keypair.publicKey, keypair2.publicKey], 2);
    console.log(`   ✅ Aggregated ${aggregated.participantKeys.length} keys with threshold ${aggregated.threshold}`);
    
    // Test 4: Test MPC signer
    console.log('4. Testing MPC signer...');
    const mpcSigner = await createMPCSigner();
    const message = new Uint8Array([1, 2, 3, 4, 5]);
    const signature = await mpcSigner.sign(message);
    console.log(`   ✅ MPC signature length: ${signature.length} bytes`);
    
    // Test 5: Test wallet functionality
    console.log('5. Testing TSS wallet...');
    const wallet = new TSSWallet('devnet');
    const walletKeypair = await wallet.generateKeypair();
    console.log(`   ✅ Wallet generated keypair: ${walletKeypair.publicKey.toString().substring(0, 16)}...`);
    
    console.log('\n✅ All tests passed! Library is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLibrary(); 