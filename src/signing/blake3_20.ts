import { blake3 } from "@noble/hashes/blake3";

/** First 20 bytes of Blake3 over `data`, matching hypersnap `blake3_20` / hub validation. */
export function blake3_20(data: Uint8Array): Uint8Array {
  return blake3(data).slice(0, 20);
}
