// Mock implementation of the WASM module
export default jest.fn().mockResolvedValue(undefined);

export const Keypair = {
  generate: jest.fn().mockReturnValue({
    public_key: () => new Array(32).fill(42),
    secret_key: () => new Array(32).fill(123),
  }),
};

export const sign = jest.fn().mockReturnValue(new Array(64).fill(255)); 