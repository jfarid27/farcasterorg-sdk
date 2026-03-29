# Guide: generating signed messages for hypersnap nodes

This guide walks through building a valid `Message`, signing it, and sending it to a node. It assumes the **Ed25519 app signer** (32-byte secret) is available in your app.

## Prerequisites

1. **FID** – The user’s Farcaster id.
2. **App signer secret** – 32 bytes, often shown as a `0x` + 64 hex chars string. This is **not** the Ethereum custody key.
3. **Network** – `FarcasterNetwork` enum: `1` mainnet, `2` testnet, `3` devnet (see `FarcasterNetworkId` in builders).
4. **Timestamp** – Farcaster time in **seconds since** `FARCASTER_EPOCH_MS` (2021-01-01 UTC). Use `getCurrentFarcasterTimestamp()` or `unixMsToFarcasterTimestamp` from `src/signing/constants.ts`.

## Step 1 — Load the signer key

Use viem only for **hex parsing** (type-safe `Hex`):

```ts
import type { Hex } from "viem";
import { hexToEd25519SecretKey, type Ed25519SecretKey } from "./src/signing/ed25519_signer.ts";

const secretHex = "0x…64 hex chars…" as Hex; // 32-byte Ed25519 seed
const secretKey: Ed25519SecretKey = hexToEd25519SecretKey(secretHex);
```

## Step 2 — Build `MessageData` (protobuf JSON shape)

Pick a builder (see `src/signing/builders.ts`):

| Action | Builder | Notes |
|--------|---------|------|
| New cast | `buildCastAddMessageData` | Text, embeds, parent cast/url, `CAST` / `LONG_CAST` etc. |
| Delete cast | `buildCastRemoveMessageData` | 20-byte cast hash as `Hex` |
| Like / recast | `buildReactionMessageData` | `messageType` 3 = add, 4 = remove |
| Follow / block / … | `buildLinkMessageData` | `linkType` string ≤ 8 chars, e.g. `"follow"`, `"block"` |
| Profile field | `buildUserDataAddMessageData` | `userDataType` numeric enum from proto |

Example — cast:

```ts
import { buildCastAddMessageData } from "./src/signing/builders.ts";

const messageData = buildCastAddMessageData({
  fid: 12345,
  network: 2, // testnet
  timestamp: getCurrentFarcasterTimestamp(),
  text: "Hello from the SDK",
});
```

The return type is **`MessageDataJson`** (`Record<string, unknown>`) — protobuf-friendly field names like `cast_add_body`, `mentions_positions`, etc.

## Step 3 — Encode and sign

```ts
import { encodeSignedMessage } from "./src/signing/encode.ts";

const protobufBytes: Uint8Array = await encodeSignedMessage(messageData, secretKey);
```

Internally this:

1. Verifies and encodes `MessageData`.
2. Computes `hash = blake3_20(encodedMessageData)`.
3. Signs `hash` with Ed25519 (`signMessageHashDigest`).
4. Fills `signer` with the public key and builds the full `Message` protobuf.

## Step 4 — Send to the node

### Option A — Direct protobuf (recommended if the client talks to the node)

```ts
import { HyperSnapClient } from "./src/client.ts";

const client = new HyperSnapClient("https://your-node");
await client.v1.submit.submitMessageProtobuf(protobufBytes);
```

### Option B — JSON relay (mobile → your server → node)

1. **Client:** `protobufMessageBytesToHubJson(protobufBytes)` → JSON matching `Types.V1.Message`.
2. **Server:** `hubJsonToProtobufBytes(json)` → `Uint8Array`, then `submitMessageProtobuf` or `submitMessageFromHubJson`.

```ts
import { protobufMessageBytesToHubJson, hubJsonToProtobufBytes } from "./src/signing/hub_json.ts";

const hubJson = await protobufMessageBytesToHubJson(protobufBytes);
// send hubJson over HTTPS to your API

// on server:
const again = await hubJsonToProtobufBytes(hubJson);
await client.v1.submit.submitMessageProtobuf(again);
```

### Option C — Validate only

```ts
await client.v1.submit.validateMessageProtobuf(protobufBytes);
// Types.V1.ValidationResult
```

## Convenience one-shots

For fewer imports, use:

- `signCastAdd`, `signCastRemove`, `signReaction`, `signLink`, `signUserDataAdd`

Each returns **full `Message` protobuf bytes** (same as `encodeSignedMessage` after the corresponding `build*`).

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Node rejects signature | Wrong key (Ethereum key used), wrong hash, or wrong digest length (must be 20 bytes) |
| Wrong timestamp | Use Farcaster seconds, not Unix seconds; use SDK helpers |
| Relay JSON fails | Ensure `Types.V1.Message` uses hub string enums and base64/hex as in `types.md` |

## Reference

- **Validation theory:** [validation.md](./validation.md)
- **Types:** [types.md](./types.md)
