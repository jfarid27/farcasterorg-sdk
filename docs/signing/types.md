# Signing-related TypeScript types

## From `src/types.ts` (hub JSON)

These describe the **JSON** shape returned by hub HTTP APIs and accepted by `submitMessageFromHubJson` after encoding.

### `Types.V1.Message`

| Field | Type | Notes |
|-------|------|------|
| `data` | `Types.V1.MessageData` | Message body |
| `hash` | `string` | `0x` + 40 hex chars (20 bytes) |
| `hashScheme` | `string` | e.g. `"HASH_SCHEME_BLAKE3"` |
| `signature` | `string` | Base64 |
| `signatureScheme` | `string` | e.g. `"SIGNATURE_SCHEME_ED25519"` |
| `signer` | `string` | `0x` + 64 hex chars (32-byte public key) |

### `Types.V1.MessageData`

| Field | Type | Notes |
|-------|------|------|
| `type` | `string` | e.g. `"MESSAGE_TYPE_CAST_ADD"` |
| `fid` | `number` | Author FID |
| `timestamp` | `number` | Farcaster timestamp (seconds since epoch) |
| `network` | `string` | e.g. `"FARCASTER_NETWORK_TESTNET"` |
| `castAddBody?`, `reactionBody?`, … | body types | Exactly one body variant per message type |

### `Types.V1.ValidationResult`

| Field | Type |
|-------|------|
| `valid` | `boolean` |
| `message?` | `Types.V1.Message` |

---

## From signing modules (`src/signing/`)

### `Ed25519SecretKey`

Branded `Uint8Array` — 32-byte Ed25519 **seed**. Created only via `hexToEd25519SecretKey(hex: Hex)`.

### `MessageDataJson`

`Record<string, unknown>` — protobufjs-compatible object for `MessageData` (snake_case nested keys: `cast_add_body`, `reaction_body`, …).

### `FarcasterNetworkId`

`1 | 2 | 3` — `MAINNET` | `TESTNET` | `DEVNET`.

### `UserDataTypeNumber`

Numeric enum subset for `UserDataBody.type` (display, bio, PFP, …) — see `builders.ts`.

### Builder param interfaces

| Interface | Used by |
|-----------|---------|
| `CastAddParams` | `buildCastAddMessageData`, `signCastAdd` |
| `CastRemoveParams` | `buildCastRemoveMessageData`, `signCastRemove` |
| `ReactionParams` | `buildReactionMessageData`, `signReaction` |
| `LinkParams` | `buildLinkMessageData`, `signLink` |
| `UserDataAddParams` | `buildUserDataAddMessageData`, `signUserDataAdd` |

### Viem

- **`Hex`** — Used for cast hashes (`0x` + 40 hex chars), signer hex, and Ed25519 secret hex when parsing with `hexToBytes` / `hexToEd25519SecretKey`.

---

## Protobuf schema

Bundled as **`proto/farcaster_message.proto`**. Loaded at runtime via `getProtoRoot()` (Deno `readTextFile`). Field numbers and enums match the hypersnap / Farcaster `message.proto` family.

If you add new message types, extend the proto and regenerate or extend `protobufjs` usage in `encode.ts` / builders.

---

## Client types for writes

| Export | Location |
|--------|----------|
| `SubmitV1` | `src/client.ts` |
| `submitMessageProtobuf(body: Uint8Array)` | `Promise<Types.V1.Message>` |
| `submitMessageFromHubJson(message: Types.V1.Message)` | `Promise<Types.V1.Message>` |
| `validateMessageProtobuf(body: Uint8Array)` | `Promise<Types.V1.ValidationResult>` |
