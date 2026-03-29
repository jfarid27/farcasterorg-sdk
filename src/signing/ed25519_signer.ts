import type { Hex } from "viem";
import { bytesToHex, hexToBytes } from "viem";
import { sha512 } from "@noble/hashes/sha2";
import { etc, getPublicKey, sign, verify } from "@noble/ed25519";

// @noble/ed25519 sync API requires SHA-512; wire noble-hashes (works in Deno and browsers).
etc.sha512Sync = (...messages: Uint8Array[]) => sha512(etc.concatBytes(...messages));

/**
 * Branded type for a 32-byte Ed25519 secret seed used to sign hub messages.
 *
 * This is **not** an Ethereum private key. Farcaster app signers are Ed25519 keys registered on-chain for an FID.
 * Viem is only used to parse hex strings into these bytes via `hexToEd25519SecretKey`.
 */
export type Ed25519SecretKey = Uint8Array & { readonly __brand: "Ed25519SecretKey" };

/**
 * Parses a `0x`-prefixed hex string into a 32-byte Ed25519 secret key (Farcaster app signer seed).
 *
 * @param hex - Exactly 32 bytes as 64 hex characters (with `0x` prefix), per viem `Hex`.
 * @returns A secret key suitable for {@link signMessageHashDigest} and {@link encodeSignedMessage}.
 * @throws If the length is not 32 bytes.
 */
export function hexToEd25519SecretKey(hex: Hex): Ed25519SecretKey {
  const b = hexToBytes(hex);
  if (b.length !== 32) {
    throw new Error("Ed25519 secret key must be 32 bytes (64 hex chars)");
  }
  return b as Ed25519SecretKey;
}

/**
 * Encodes a 32-byte Ed25519 public key as a lowercase `0x` hex string (hub JSON `signer` field).
 *
 * @param publicKey - 32-byte Ed25519 verifying key.
 */
export function ed25519PublicKeyToHex(publicKey: Uint8Array): Hex {
  if (publicKey.length !== 32) {
    throw new Error("Ed25519 public key must be 32 bytes");
  }
  return bytesToHex(publicKey);
}

/**
 * Signs the 20-byte Blake3 message digest with Ed25519 (RFC 8032), as required by hub validation.
 *
 * The hub verifies `signature` over **`hash`**, not over raw `MessageData` bytes.
 *
 * @param digest - Exactly 20 bytes from `blake3_20`.
 * @param secretKey - App signer secret from {@link hexToEd25519SecretKey}.
 * @returns 64-byte Ed25519 signature.
 */
export function signMessageHashDigest(
  digest: Uint8Array,
  secretKey: Ed25519SecretKey,
): Uint8Array {
  if (digest.length !== 20) {
    throw new Error("Farcaster message digest is 20-byte Blake3 (blake3_20)");
  }
  return sign(digest, secretKey);
}

/**
 * Derives the Ed25519 public key (32 bytes) from a secret seed.
 *
 * @param secretKey - Same seed as used for signing.
 */
export function getSignerPublicKey(secretKey: Ed25519SecretKey): Uint8Array {
  return getPublicKey(secretKey);
}

/**
 * Verifies an Ed25519 signature on the 20-byte Blake3 digest (mirrors hypersnap `validate_signature` for Ed25519).
 *
 * @param digest - 20-byte Blake3 hash of encoded `MessageData`.
 * @param signature - 64-byte signature from {@link signMessageHashDigest}.
 * @param publicKey - 32-byte Ed25519 public key (must match `Message.signer` on the wire).
 * @returns `true` if the signature is valid for this digest and key.
 */
export function verifyMessageHashDigest(
  digest: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  return verify(signature, digest, publicKey);
}
