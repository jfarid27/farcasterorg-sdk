# Client namespaces reference

Method → return type mapping for the public `HyperSnapClient` API. Types are from **`Types.V1`** / **`Types.V2`** in `src/types.ts`.

## `client.v1.casts`

| Method | Returns |
|--------|---------|
| `getById(fid, hash)` | `Promise<Types.V1.Message>` |
| `getByFid(params)` | `Promise<Types.V1.PagedResponse>` |
| `getByMention(fid)` | `Promise<Types.V1.PagedResponse>` |
| `getByParent(params)` | `Promise<Types.V1.PagedResponse>` |

## `client.v1.reactions`

| Method | Returns |
|--------|---------|
| `getById(params)` | `Promise<Types.V1.Message>` |
| `getByFid(fid, reaction_type)` | `Promise<Types.V1.PagedResponse>` |
| `getByCast(target_fid, target_hash)` | `Promise<Types.V1.PagedResponse>` |

## `client.v1.links`

| Method | Returns |
|--------|---------|
| `getById(fid, link_type, target_fid?)` | `Promise<Types.V1.Message>` |
| `getByFid(fid, link_type?)` | `Promise<Types.V1.PagedResponse>` |

## `client.v1.users`

| Method | Returns |
|--------|---------|
| `getDataByFid(fid)` | `Promise<Types.V1.PagedResponse>` |
| `getStorageLimits(fid)` | `Promise<Types.V1.StorageLimitsResponse>` |
| `getFidByName(name, type?)` | `Promise<Types.V1.FidResponse>` |
| `getAddressesByName(name, type?)` | `Promise<Types.V1.NameToAddressResponse>` |
| `getFidByAddress(address)` | `Promise<Types.V1.AddressToFidResponse>` |
| `getFids(params)` | `Promise<Types.V1.GetFidsResponse>` — **`shard_id` required** |

## `client.v1.events`

| Method | Returns |
|--------|---------|
| `getEvents(params)` | `Promise<Types.V1.EventsResponse>` |
| `getEventById(event_id, shard_index)` | `Promise<Types.V1.HubEvent>` |

## `client.v1.network`

| Method | Returns |
|--------|---------|
| `getInfo()` | `Promise<Types.V1.InfoResponse>` |
| `getPeers()` | `Promise<Types.V1.GetConnectedPeersResponse>` |

## `client.v1.submit` (`SubmitV1`)

| Method | Returns |
|--------|---------|
| `submitMessageProtobuf(body: Uint8Array)` | `Promise<Types.V1.Message>` |
| `submitMessageFromHubJson(message: Types.V1.Message)` | `Promise<Types.V1.Message>` |
| `validateMessageProtobuf(body: Uint8Array)` | `Promise<Types.V1.ValidationResult>` |

## `client.v2.social`

| Method | Returns |
|--------|---------|
| `getFollowers(fid, cursor?, limit?)` | `Promise<Types.V2.FollowersResponse>` |
| `getFollowing(fid, cursor?, limit?)` | `Promise<Types.V2.FollowersResponse>` |

## `client.v2.channels`

| Method | Returns |
|--------|---------|
| `getInfo(id, type?)` | `Promise<Types.V2.ChannelResponse>` |
| `getMembers(channel_id, cursor?, limit?)` | `Promise<Types.V2.ChannelMemberListResponse>` |

## `client.v2.search`

| Method | Returns |
|--------|---------|
| `searchCasts(q, cursor?, limit?)` | `Promise<Types.V2.CastsSearchResponse>` |

## `client.v2.conversations`

| Method | Returns |
|--------|---------|
| `getConversation(identifier, type, reply_depth?)` | `Promise<Types.V2.ConversationResponse>` |

## `client.v2.feeds`

| Method | Returns |
|--------|---------|
| `getFollowingFeed(fid, cursor?, limit?)` | `Promise<Types.V2.FeedResponse>` |
| `getTrendingFeed(time_window?, cursor?, limit?)` | `Promise<Types.V2.FeedResponse>` |
