/**
 * Signed hub writes use **Ed25519** keys registered for an FID (hypersnap validates `SIGNATURE_SCHEME_ED25519`).
 *
 * **Mobile + server:** The app can bundle this SDK to build and sign protobuf `Message` bytes (or hub JSON for your API).
 * A typical **Ethereum viem wallet** (`PrivateKeyAccount`) does **not** sign these messages; you need the user’s
 * **Farcaster app signer** secret (32-byte Ed25519 seed), often stored in the app secure storage. Viem is only used here
 * for viem `Hex` typing and `hexToBytes` / `bytesToHex` for that key material.
 *
 * The **server** can use the same SDK to turn relayed hub JSON into protobuf (`hubJsonToProtobufBytes`) and call
 * `HyperSnapClient` methods `v1.submit.submitMessageProtobuf` / `submitMessageFromHubJson` against a node
 * (`Content-Type: application/octet-stream`).
 *
 * @module
 */
export * from "./blake3_20.ts";
export * from "./constants.ts";
export * from "./ed25519_signer.ts";
export * from "./encode.ts";
export * from "./builders.ts";
export * from "./hub_json.ts";
export * from "./proto_root.ts";
