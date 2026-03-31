import * as Types from "./types.ts";
import { hubJsonToProtobufBytes } from "./signing/hub_json.ts";

/**
 * HyperSnapClient is the main entry point for the HyperSnap SDK.
 * It provides access to both V1 (Hubble-compatible) and V2 (Farcaster API compatibility) namespaces.
 *
 * ### Sharding Logic
 * HyperSnap utilizes a sharded architecture. This client automatically handles shard calculation
 * and routing so users don't have to deal with failures due to sharding.
 *
 * Calculation Formula:
 * `(SHA256(FID_BE_BYTES).take(4).to_u32_be() % total_shards) + 1`
 */
export class HyperSnapClient {
  private baseURL: string;
  private config?: RequestInit;
  /** Namespace for Hubble-compatible Hub V1 APIs */
  public v1: V1Namespace;
  /** Namespace for Farcaster API V2 compatibility APIs */
  public v2: V2Namespace;

  private _numShards: number | null = null;

  /**
   * Create a new HyperSnapClient.
   * @param baseURL The base URL of the HyperSnap node (e.g., "http://localhost:8080")
   * @param config Optional fetch request configuration
   */
  constructor(baseURL: string, config?: RequestInit) {
    this.baseURL = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
    this.config = config;

    this.v1 = new V1Namespace(this);
    this.v2 = new V2Namespace(this);
  }

  /**
   * Internal request helper.
   */
  private async request<T>(
    method: string,
    path: string,
    options: {
      params?: Record<string, any>;
      body?: any;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const url = new URL(path.startsWith("/") ? path : `/${path}`, this.baseURL);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const res = await fetch(url.toString(), {
      method,
      ...this.config,
      headers: {
        ...this.config?.headers,
        ...options.headers,
      },
      body: options.body,
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const errorData = await res.json();
        detail = errorData.detail || errorData.details || JSON.stringify(errorData);
      } catch {
        // use statusText if json fails
      }
      throw new Error(`HTTP error! status: ${res.status}, detail: ${detail}`);
    }

    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/octet-stream")) {
      return (await res.arrayBuffer()) as T;
    }
    return (await res.json()) as T;
  }

  /**
   * Perform a GET request.
   */
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  /**
   * Perform a POST request.
   */
  async post<T>(path: string, body?: any, options: { headers?: Record<string, string> } = {}): Promise<T> {
    return this.request<T>("POST", path, { body, ...options });
  }

  /**
   * Cryptographically calculate the shard ID for a given FID.
   *
   * Logic:
   * 1. FID is converted to an 8-byte big-endian Uint64.
   * 2. SHA-256 hash is computed.
   * 3. The first 4 bytes are interpreted as a big-endian Uint32.
   * 4. Shard = (hashUint32 % total_shards) + 1.
   *
   * @param fid The Farcaster ID to route.
   * @returns A promise that resolves to the shard ID (1 to total_shards).
   */
  async getShardForFid(fid: number): Promise<number> {
    if (this._numShards === null) {
      await this.refreshShardInfo();
    }

    const numShards = this._numShards || 1;
    if (numShards === 1) return 1;

    // Convert fid to 8-byte big-endian buffer (uint64)
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(fid), false); // false = big-endian

    // Calculate SHA-256 hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = new Uint8Array(hashBuffer);

    // Take first 4 bytes as u32 (big-endian)
    const hashU32 = (hashArray[0] << 24) | (hashArray[1] << 16) | (hashArray[2] << 8) | hashArray[3];

    // Ensure unsigned result before modulo
    const unsignedHashU32 = hashU32 >>> 0;
    return (unsignedHashU32 % numShards) + 1;
  }

  /**
   * Fetch the latest shard count from the node and update the local cache.
   */
  async refreshShardInfo(): Promise<void> {
    const data = await this.get<Types.V1.InfoResponse>("/v1/info");
    this._numShards = data.numShards;
  }

  /**
   * Manually set the number of shards if known upfront.
   */
  set numShards(value: number) {
    this._numShards = value;
  }

  /**
   * Get the current cached number of shards.
   */
  get numShards(): number | null {
    return this._numShards;
  }
}

/**
 * Namespace for Hubble-compatible Hub V1 APIs.
 */
class V1Namespace {
  /** APIs for interacting with Casts */
  public casts: CastsV1;
  /** APIs for interacting with Reactions */
  public reactions: ReactionsV1;
  /** APIs for interacting with Links */
  public links: LinksV1;
  /** APIs for interacting with Users and Storage */
  public users: UsersV1;
  /** APIs for interacting with Hub Events */
  public events: EventsV1;
  /** APIs for Hub network information */
  public network: NetworkV1;
  /**
   * Submit signed protobuf messages (`POST /v1/submitMessage`).
   * The node accepts `application/octet-stream` bodies only (not raw JSON).
   */
  public submit: SubmitV1;

  constructor(private client: HyperSnapClient) {
    this.casts = new CastsV1(client);
    this.reactions = new ReactionsV1(client);
    this.links = new LinksV1(client);
    this.users = new UsersV1(client);
    this.events = new EventsV1(client);
    this.network = new NetworkV1(client);
    this.submit = new SubmitV1(client);
  }

  /**
   * Get general information about the Hub.
   * Caches the shard count for future requests.
   */
  async getInfo(): Promise<Types.V1.InfoResponse> {
    const res = await this.network.getInfo();
    return res;
  }
}

/**
 * V1 APIs for interacting with Casts.
 */
class CastsV1 {
  constructor(private client: HyperSnapClient) {}

  /**
   * Retrieve a specific cast by its FID and hash.
   * Sharding: The node routes this internally based on FID.
   */
  async getById(fid: number, hash: string): Promise<Types.V1.Message> {
    return this.client.get("/v1/castById", { fid, hash });
  }

  /**
   * Retrieve all casts authored by a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getByFid(params: {
    fid: number;
    start_timestamp?: number;
    stop_timestamp?: number;
    page_size?: number;
    page_token?: string;
    reverse?: boolean;
  }): Promise<Types.V1.PagedResponse> {
    return this.client.get("/v1/castsByFid", params);
  }

  /**
   * Retrieve all casts that mention a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getByMention(fid: number): Promise<Types.V1.PagedResponse> {
    return this.client.get("/v1/castsByMention", { fid });
  }

  /**
   * Retrieve all casts that are replies to a specific parent cast or URL.
   * Sharding: If parent has an FID, the node routes internally.
   */
  async getByParent(params: {
    fid?: number;
    hash?: string;
    url?: string;
  }): Promise<Types.V1.PagedResponse> {
    return this.client.get("/v1/castsByParent", params);
  }
}

/**
 * V1 APIs for interacting with Reactions.
 */
class ReactionsV1 {
  constructor(private client: HyperSnapClient) {}

  /**
   * Retrieve a specific reaction.
   * Sharding: The node routes this internally based on FID.
   */
  async getById(params: {
    fid: number;
    reaction_type: number;
    target_fid?: number;
    target_hash?: string;
    target_url?: string;
  }): Promise<Types.V1.Message> {
    return this.client.get("/v1/reactionById", params);
  }

  /**
   * Retrieve all reactions authored by a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getByFid(fid: number, reaction_type: number): Promise<Types.V1.PagedResponse> {
    return this.client.get("/v1/reactionsByFid", { fid, reaction_type });
  }

  /**
   * Retrieve all reactions for a specific cast.
   * Sharding: The node routes this internally based on target_fid.
   */
  async getByCast(target_fid: number, target_hash: string): Promise<Types.V1.PagedResponse> {
    return this.client.get("/v1/reactionsByCast", { target_fid, target_hash });
  }
}

/**
 * V1 APIs for interacting with Links.
 */
class LinksV1 {
  constructor(private client: HyperSnapClient) {}

  /**
   * Retrieve a specific link.
   * Sharding: The node routes this internally based on FID.
   */
  async getById(fid: number, link_type: string, target_fid?: number): Promise<Types.V1.Message> {
    return this.client.get("/v1/linkById", { fid, link_type, target_fid });
  }

  /**
   * Retrieve all links authored by a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getByFid(fid: number, link_type?: string): Promise<Types.V1.PagedResponse> {
    return this.client.get("/v1/linksByFid", { fid, link_type });
  }
}

/**
 * V1 APIs for interacting with Users and Storage.
 */
class UsersV1 {
  constructor(private client: HyperSnapClient) {}

  /**
   * Retrieve user data (pfp, bio, etc.) for a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getDataByFid(fid: number): Promise<Types.V1.PagedResponse> {
    return this.client.get("/v1/userDataByFid", { fid });
  }

  /**
   * Retrieve storage limits and usage for a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getStorageLimits(fid: number): Promise<Types.V1.StorageLimitsResponse> {
    return this.client.get("/v1/storageLimitsByFid", { fid });
  }

  /**
   * Look up an FID by a username.
   */
  async getFidByName(name: string, type?: string): Promise<Types.V1.FidResponse> {
    return this.client.get("/v1/fidByName", { name, type });
  }

  /**
   * Retrieve connected addresses for a username.
   */
  async getAddressesByName(name: string, type?: string): Promise<Types.V1.NameToAddressResponse> {
    return this.client.get("/v1/addressesByName", { name, type });
  }

  /**
   * Look up FIDs associated with an Ethereum or Solana address.
   */
  async getFidByAddress(address: string): Promise<Types.V1.AddressToFidResponse> {
    return this.client.get("/v1/fidByAddress", { address });
  }

  /**
   * Retrieve a paged list of all FIDs registered on the network for a specific shard.
   *
   * ### Sharding Dependency
   * This endpoint **requires** a shard_id. Use `client.getShardForFid(fid)` to find
   * the shard for a specific user, or iterate from 1 to `client.numShards` to crawl the network.
   *
   * @param params Query parameters including shard_id (Required).
   */
  async getFids(params: {
    shard_id: number;
    page_size?: number;
    page_token?: string;
    reverse?: boolean;
  }): Promise<Types.V1.GetFidsResponse> {
    return this.client.get("/v1/fids", params);
  }
}

/**
 * V1 APIs for interacting with Hub Events.
 */
class EventsV1 {
  constructor(private client: HyperSnapClient) {}

  /**
   * Stream or poll hub events for a specific shard.
   * @param params Query parameters including shard_index (1 to numShards).
   */
  async getEvents(params: {
    from_event_id?: number;
    shard_index: number;
    stop_id?: number;
  }): Promise<Types.V1.EventsResponse> {
    return this.client.get("/v1/events", params);
  }

  /**
   * Retrieve a specific hub event by its ID and shard index.
   */
  async getEventById(event_id: number, shard_index: number): Promise<Types.V1.HubEvent> {
    return this.client.get("/v1/eventById", { event_id, shard_index });
  }
}

/**
 * V1 APIs for Hub network information.
 */
class NetworkV1 {
  constructor(private client: HyperSnapClient) {}

  /**
   * Get general information about the Hub.
   * This updates the client's internal shard count.
   */
  async getInfo(): Promise<Types.V1.InfoResponse> {
    const data = await this.client.get<Types.V1.InfoResponse>("/v1/info");
    this.client.numShards = data.numShards;
    return data;
  }

  /**
   * Retrieve the list of currently connected gossip peers.
   */
  async getPeers(): Promise<Types.V1.GetConnectedPeersResponse> {
    return this.client.get("/v1/currentPeers");
  }
}

/**
 * Hub write API: `POST /v1/submitMessage` and `POST /v1/validateMessage` with `application/octet-stream` bodies.
 *
 * On the server, prefer passing bytes from the client or use `submitMessageFromHubJson` after `hubJsonToProtobufBytes`.
 */
export class SubmitV1 {
  constructor(private client: HyperSnapClient) {}

  /**
   * Submits a serialized `Message` protobuf to the node (hypersnap-compatible HTTP API).
   *
   * @param body - Raw protobuf bytes (e.g. from `encodeSignedMessage` on the client).
   * @returns JSON representation of the accepted message as returned by the hub.
   */
  async submitMessageProtobuf(body: Uint8Array): Promise<Types.V1.Message> {
    return this.client.post<Types.V1.Message>("/v1/submitMessage", body, {
      headers: { "Content-Type": "application/octet-stream" },
    });
  }

  /**
   * Converts hub-shaped JSON to protobuf and calls `submitMessageProtobuf` (for relay servers).
   *
   * @param message - `Types.V1.Message` from a client or `protobufMessageBytesToHubJson`.
   */
  async submitMessageFromHubJson(message: Types.V1.Message): Promise<Types.V1.Message> {
    const bytes = await hubJsonToProtobufBytes(message);
    return this.submitMessageProtobuf(bytes);
  }

  /**
   * Asks the node to validate a `Message` without merging it (`POST /v1/validateMessage`).
   *
   * @param body - Same protobuf bytes as for `submitMessageProtobuf`.
   */
  async validateMessageProtobuf(body: Uint8Array): Promise<Types.V1.ValidationResult> {
    return this.client.post<Types.V1.ValidationResult>("/v1/validateMessage", body, {
      headers: { "Content-Type": "application/octet-stream" },
    });
  }
}

/**
 * Namespace for Farcaster API V2 compatibility APIs.
 */
class V2Namespace {
  public social: SocialV2;
  public channels: ChannelsV2;
  public search: SearchV2;
  public conversations: ConversationsV2;
  public feeds: FeedsV2;

  constructor(client: HyperSnapClient) {
    this.social = new SocialV2(client);
    this.channels = new ChannelsV2(client);
    this.search = new SearchV2(client);
    this.conversations = new ConversationsV2(client);
    this.feeds = new FeedsV2(client);
  }
}

class SocialV2 {
  constructor(private client: HyperSnapClient) {}
  async getFollowers(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FollowersResponse> {
    return this.client.get("/v2/farcaster/followers", { fid, cursor, limit });
  }
  async getFollowing(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FollowersResponse> {
    return this.client.get("/v2/farcaster/following", { fid, cursor, limit });
  }
}

class ChannelsV2 {
  constructor(private client: HyperSnapClient) {}
  async getInfo(id: string, type: "id" | "parent_url" = "id"): Promise<Types.V2.ChannelResponse> {
    return this.client.get("/v2/farcaster/channel", { id, type });
  }
  async getMembers(channel_id: string, cursor?: string, limit?: number): Promise<Types.V2.ChannelMemberListResponse> {
    return this.client.get("/v2/farcaster/channel/member/list", { channel_id, cursor, limit });
  }
}

class SearchV2 {
  constructor(private client: HyperSnapClient) {}
  async searchCasts(q: string, cursor?: string, limit?: number): Promise<Types.V2.CastsSearchResponse> {
    return this.client.get("/v2/farcaster/cast/search", { q, cursor, limit });
  }
}

class ConversationsV2 {
  constructor(private client: HyperSnapClient) {}
  async getConversation(identifier: string, type: "hash" | "url", reply_depth?: number): Promise<Types.V2.ConversationResponse> {
    return this.client.get("/v2/farcaster/cast/conversation", { identifier, type, reply_depth });
  }
}

class FeedsV2 {
  constructor(private client: HyperSnapClient) {}
  async getFollowingFeed(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FeedResponse> {
    return this.client.get("/v2/farcaster/feed/following", { fid, cursor, limit });
  }
  async getTrendingFeed(time_window?: string, cursor?: string, limit?: number): Promise<Types.V2.FeedResponse> {
    return this.client.get("/v2/farcaster/feed/trending", { time_window, cursor, limit });
  }
}
