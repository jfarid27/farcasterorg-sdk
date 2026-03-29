/**
 * Signed writes use **Ed25519** signer keys registered on-chain for an FID (see hypersnap `validate_signature`).
 * Ethereum wallets (viem `PrivateKeyAccount`) sign **different** curves; this module uses viem only for `Hex` and byte conversion of **raw Ed25519** key material.
 */
export * from "./blake3_20.ts";
export * from "./constants.ts";
export * from "./ed25519_signer.ts";
export * from "./encode.ts";
export * from "./builders.ts";
export * from "./hub_json.ts";
export * from "./proto_root.ts";
