import { blake3 } from "@noble/hashes/blake3";

/**
 * Computes the first 20 bytes of the Blake3 hash over `data`.
 *
 * Matches hypersnap’s `blake3_20` and the hub’s `HASH_SCHEME_BLAKE3` check: the message digest signed by Ed25519
 * is exactly these 20 bytes over the serialized `MessageData`.
 *
 * @param data - Canonical protobuf encoding of `MessageData`.
 * @returns A 20-byte digest.
 */
export function blake3_20(data: Uint8Array): Uint8Array {
  return blake3(data).slice(0, 20);
}
