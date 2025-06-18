// Mock implementation of the WASM module for testing
module.exports = {
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined), // mock init function
  Keypair: class MockKeypair {
    static generate() {
      return new MockKeypair();
    }
    
    public_key() {
      return new Array(32).fill(0); // Mock 32-byte public key
    }
    
    secret_key() {
      return new Array(32).fill(1); // Mock 32-byte secret key
    }
  },
  sign: jest.fn().mockReturnValue(new Array(64).fill(2)) // Mock 64-byte signature
}; 