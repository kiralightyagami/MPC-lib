// TypeScript declarations for the ed25519_tss_wasm module
declare module '../../pkg/ed25519_tss_wasm' {
  export default function init(): Promise<void>;
  
  export class Keypair {
    static generate(): Keypair;
    public_key(): number[];
    secret_key(): number[];
  }
  
  export function sign(message: Uint8Array, secretKey: number[]): number[];
} 