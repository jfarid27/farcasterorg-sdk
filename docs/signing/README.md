# Signing

This folder documents how **hypersnap** validates signed hub messages and how this SDK constructs them. Writes are **not** signed with Ethereum keys; they use **Ed25519** app signer keys registered for a FID.

## Documents

| File | Content |
|------|---------|
| [validation.md](./validation.md) | How hypersnap validates `Message` (hash, signature, signer, state) |
| [guide.md](./guide.md) | Step-by-step: generate signed bytes and send to a node |
| [types.md](./types.md) | TypeScript types and protobuf field conventions |

## Module map (`src/signing/`)

| Module | Responsibility |
|--------|----------------|
| `ed25519_signer.ts` | Ed25519 secret from hex (`viem` helpers), sign/verify 20-byte digest |
| `blake3_20.ts` | Blake3 digest (first 20 bytes) over `MessageData` bytes |
| `constants.ts` | Farcaster epoch (`FARCASTER_EPOCH_MS`), timestamp helpers |
| `encode.ts` | `encodeSignedMessage`, `hashMessageData`, `decodeMessageProtobuf` |
| `builders.ts` | `buildCastAddMessageData`, `signCastAdd`, link/reaction/user-data builders |
| `hub_json.ts` | `protobufMessageBytesToHubJson`, `hubJsonToProtobufBytes` |
| `proto_root.ts` | Loads `proto/farcaster_message.proto` for protobufjs |

## Exports

Everything above is re-exported from `src/signing/mod.ts` (and thus from the package root `src/mod.ts`).
