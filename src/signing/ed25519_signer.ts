import type { Hex } from "viem";
import { bytesToHex, hexToBytes } from "viem";
import { sha512 } from "@noble/hashes/sha2";
import { etc, getPublicKey, sign, verify } from "@noble/ed25519";

// @noble/ed25519 sync API requires SHA-512; wire noble-hashes (works in Deno and browsers).
etc.sha512Sync = (...messages: Uint8Array[]) => sha512(etc.concatBytes(...messages));

/**
 * Farcaster hub messages use an Ed25519 signer key (32-byte secret seed), not an Ethereum secp256k1 key.
 * Use {@link hexToEd25519SecretKey} to interpret a hex string as raw Ed25519 key bytes.
 * Viem is used for hex typing and conversion only.
 */
export type Ed25519SecretKey = Uint8Array & { readonly __brand: "Ed25519SecretKey" };

export function hexToEd25519SecretKey(hex: Hex): Ed25519SecretKey {
  const b = hexToBytes(hex);
  if (b.length !== 32) {
    throw new Error("Ed25519 secret key must be 32 bytes (64 hex chars)");
  }
  return b as Ed25519SecretKey;
}

export function ed25519PublicKeyToHex(publicKey: Uint8Array): Hex {
  if (publicKey.length !== 32) {
    throw new Error("Ed25519 public key must be 32 bytes");
  }
  return bytesToHex(publicKey);
}

export function signMessageHashDigest(
  digest: Uint8Array,
  secretKey: Ed25519SecretKey,
): Uint8Array {
  if (digest.length !== 20) {
    throw new Error("Farcaster message digest is 20-byte Blake3 (blake3_20)");
  }
  return sign(digest, secretKey);
}

export function getSignerPublicKey(secretKey: Ed25519SecretKey): Uint8Array {
  return getPublicKey(secretKey);
}

/** Verify Ed25519 signature on the 20-byte Blake3 digest (hub validation). */
export function verifyMessageHashDigest(
  digest: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  return verify(signature, digest, publicKey);
}
