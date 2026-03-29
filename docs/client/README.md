# Client

The SDK entry class is **`HyperSnapClient`**. It wraps an Axios instance and exposes two top-level **namespaces**:

- **`v1`** — Hubble-compatible hub HTTP APIs (reads and writes).
- **`v2`** — Farcaster-style compatibility endpoints (reads only in this SDK).

```ts
import { HyperSnapClient } from "@jfarid27/farcaster-sdk"; // or your import path

const client = new HyperSnapClient("https://your-hypersnap-node.example");
await client.v1.getInfo(); // refreshes shard cache
```

---

## `HyperSnapClient`

| Member | Type | Purpose |
|--------|------|---------|
| `v1` | `V1Namespace` | Hub V1 APIs |
| `v2` | `V2Namespace` | Farcaster V2–style APIs |
| `getShardForFid(fid)` | `Promise<number>` | Shard id (1…N) from FID + node shard count |
| `refreshShardInfo()` | `Promise<void>` | Fetches `/v1/info` and caches `numShards` |
| `numShards` | `number \| null` | Cached shard count (set by `getInfo` / `refreshShardInfo`) |

Sharding uses: SHA-256(FID as 8-byte big-endian) → first 4 bytes as u32 → `(u32 % numShards) + 1`. See `HyperSnapClient.getShardForFid` in `src/client.ts`.

---

## V1 namespace (`client.v1`)

### Sub-namespaces (read APIs)

| Property | Class | Base path (examples) |
|----------|--------|----------------------|
| `casts` | `CastsV1` | `/v1/castById`, `/v1/castsByFid`, … |
| `reactions` | `ReactionsV1` | `/v1/reactionById`, … |
| `links` | `LinksV1` | `/v1/linkById`, … |
| `users` | `UsersV1` | `/v1/userDataByFid`, `/v1/fids`, … |
| `events` | `EventsV1` | `/v1/events`, `/v1/eventById` |
| `network` | `NetworkV1` | `/v1/info`, `/v1/currentPeers` |

### Writes: `client.v1.submit` (`SubmitV1`)

Hypersnap accepts **protobuf** bodies only for these routes (not JSON):

| Method | HTTP | Request body | Response |
|--------|------|--------------|----------|
| `submitMessageProtobuf` | `POST /v1/submitMessage` | `Uint8Array` — serialized `Message` | `Types.V1.Message` (JSON) |
| `submitMessageFromHubJson` | same | Encodes `Types.V1.Message` JSON → protobuf first | `Types.V1.Message` (JSON) |
| `validateMessageProtobuf` | `POST /v1/validateMessage` | `Uint8Array` — `Message` | `Types.V1.ValidationResult` |

Headers: `Content-Type: application/octet-stream`.

Typings:

- Request/response message shape: **`Types.V1.Message`** (`src/types.ts`).
- Validation: **`Types.V1.ValidationResult`** (`valid`, optional `message`).

### Convenience on `V1Namespace`

- `getInfo()` — delegates to `v1.network.getInfo()` and returns **`Types.V1.InfoResponse`**.

---

## V2 namespace (`client.v2`)

| Property | Purpose | Example types |
|----------|---------|----------------|
| `social` | Followers / following | `Types.V2.FollowersResponse` |
| `channels` | Channel info / members | `Types.V2.ChannelResponse`, … |
| `search` | Cast search | `Types.V2.CastsSearchResponse` |
| `conversations` | Thread by hash/url | `Types.V2.ConversationResponse` |
| `feeds` | Following / trending feeds | `Types.V2.FeedResponse` |

V2 is **read-oriented** in this SDK; signed writes go through **V1 submit** + signing module.

---

## TypeScript namespaces (`Types`)

All hub JSON shapes used by the client and signing live under **`Types.V1`** and **`Types.V2`** in `src/types.ts`.

### `Types.V1` (high-signal types)

| Type | Role |
|------|------|
| `InfoResponse` | `/v1/info` |
| `Message` | Hub message envelope in JSON (hash, signature, signer, `data`) |
| `MessageData` | Discriminated by `type` string (`MESSAGE_TYPE_*`) and optional `*Body` fields |
| `CastAddBody`, `CastRemoveBody`, `ReactionBody`, `LinkBody`, `UserDataBody`, … | Body variants |
| `ValidationResult` | `validateMessage` response |
| `PagedResponse` | Lists with `messages`, `nextPageToken` |

### `Types.V2`

| Type | Role |
|------|------|
| `FollowersResponse`, `ChannelResponse`, `FeedResponse`, … | V2 JSON responses |

Import pattern:

```ts
import type * as Types from "./types.ts";

function handle(m: Types.V1.Message) {
  console.log(m.data.type);
}
```

See **[namespaces.md](./namespaces.md)** for a fuller map of `client.v1.*` methods to response types.
