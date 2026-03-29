# HyperSnap SDK documentation

TypeScript SDK for reading from and writing to [HyperSnap](https://github.com/farcasterxyz/hub-monorepo)–compatible nodes (hypersnap fork). This documentation covers the HTTP client and the **signed message** pipeline used for state changes (casts, reactions, links, user data).

## Contents

| Area | Description |
|------|-------------|
| [Client](./client/README.md) | `HyperSnapClient`, V1/V2 namespaces, sharding, submits |
| [Signing](./signing/README.md) | Hub validation rules, Ed25519/Blake3, builders, relay JSON |

## Package entrypoints

- **Deno / source:** `import { … } from "./src/mod.ts"` (see `deno.json` `exports`).
- **Published types:** `Types.V1`, `Types.V2` in `src/types.ts`; signing helpers in `src/signing/`.

## Quick links

- **Read-only hub APIs:** `client.v1.*` (casts, reactions, links, users, events, network).
- **Writes:** `client.v1.submit.*` — requires protobuf `Message` bytes (`application/octet-stream`).
- **Signing:** `encodeSignedMessage`, `buildCastAddMessageData`, `signCastAdd`, etc., plus `protobufMessageBytesToHubJson` / `hubJsonToProtobufBytes` for JSON relays.
