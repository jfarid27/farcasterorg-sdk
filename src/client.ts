import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import * as Types from "./types.ts";

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
  private axios: AxiosInstance;
  /** Namespace for Hubble-compatible Hub V1 APIs */
  public v1: V1Namespace;
  /** Namespace for Farcaster API V2 compatibility APIs */
  public v2: V2Namespace;

  private _numShards: number | null = null;

  /**
   * Create a new HyperSnapClient.
   * @param baseURL The base URL of the HyperSnap node (e.g., "http://localhost:8080")
   * @param config Optional Axios request configuration
   */
  constructor(baseURL: string, config?: AxiosRequestConfig) {
    this.axios = axios.create({
      baseURL,
      ...config,
    });

    this.v1 = new V1Namespace(this.axios, this);
    this.v2 = new V2Namespace(this.axios);
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
    const { data } = await this.axios.get<Types.V1.InfoResponse>("/v1/info");
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

  constructor(client: AxiosInstance, private parent: HyperSnapClient) {
    this.casts = new CastsV1(client, parent);
    this.reactions = new ReactionsV1(client, parent);
    this.links = new LinksV1(client, parent);
    this.users = new UsersV1(client, parent);
    this.events = new EventsV1(client, parent);
    this.network = new NetworkV1(client, parent);
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
  constructor(private client: AxiosInstance, private parent: HyperSnapClient) {}

  /**
   * Retrieve a specific cast by its FID and hash.
   * Sharding: The node routes this internally based on FID.
   */
  async getById(fid: number, hash: string): Promise<Types.V1.Message> {
    const { data } = await this.client.get("/v1/castById", {
      params: { fid, hash },
    });
    return data;
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
    const { data } = await this.client.get("/v1/castsByFid", {
      params,
    });
    return data;
  }

  /**
   * Retrieve all casts that mention a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getByMention(fid: number): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/castsByMention", {
      params: { fid },
    });
    return data;
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
    const { data } = await this.client.get("/v1/castsByParent", {
      params,
    });
    return data;
  }
}

/**
 * V1 APIs for interacting with Reactions.
 */
class ReactionsV1 {
  constructor(private client: AxiosInstance, private parent: HyperSnapClient) {}

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
    const { data } = await this.client.get("/v1/reactionById", { params });
    return data;
  }

  /**
   * Retrieve all reactions authored by a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getByFid(fid: number, reaction_type: number): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/reactionsByFid", {
      params: { fid, reaction_type },
    });
    return data;
  }

  /**
   * Retrieve all reactions for a specific cast.
   * Sharding: The node routes this internally based on target_fid.
   */
  async getByCast(target_fid: number, target_hash: string): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/reactionsByCast", {
      params: { target_fid, target_hash },
    });
    return data;
  }
}

/**
 * V1 APIs for interacting with Links.
 */
class LinksV1 {
  constructor(private client: AxiosInstance, private parent: HyperSnapClient) {}

  /**
   * Retrieve a specific link.
   * Sharding: The node routes this internally based on FID.
   */
  async getById(fid: number, link_type: string, target_fid?: number): Promise<Types.V1.Message> {
    const { data } = await this.client.get("/v1/linkById", {
      params: { fid, link_type, target_fid },
    });
    return data;
  }

  /**
   * Retrieve all links authored by a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getByFid(fid: number, link_type?: string): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/linksByFid", {
      params: { fid, link_type },
    });
    return data;
  }
}

/**
 * V1 APIs for interacting with Users and Storage.
 */
class UsersV1 {
  constructor(private client: AxiosInstance, private parent: HyperSnapClient) {}

  /**
   * Retrieve user data (pfp, bio, etc.) for a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getDataByFid(fid: number): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/userDataByFid", { params: { fid } });
    return data;
  }

  /**
   * Retrieve storage limits and usage for a specific FID.
   * Sharding: The node routes this internally based on FID.
   */
  async getStorageLimits(fid: number): Promise<Types.V1.StorageLimitsResponse> {
    const { data } = await this.client.get("/v1/storageLimitsByFid", {
      params: { fid },
    });
    return data;
  }

  /**
   * Look up an FID by a username.
   */
  async getFidByName(name: string, type?: string): Promise<Types.V1.FidResponse> {
    const { data } = await this.client.get("/v1/fidByName", {
      params: { name, type },
    });
    return data;
  }

  /**
   * Retrieve connected addresses for a username.
   */
  async getAddressesByName(name: string, type?: string): Promise<Types.V1.NameToAddressResponse> {
    const { data } = await this.client.get("/v1/addressesByName", {
      params: { name, type },
    });
    return data;
  }

  /**
   * Look up FIDs associated with an Ethereum or Solana address.
   */
  async getFidByAddress(address: string): Promise<Types.V1.AddressToFidResponse> {
    const { data } = await this.client.get("/v1/fidByAddress", {
      params: { address },
    });
    return data;
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
    const { data } = await this.client.get("/v1/fids", { params });
    return data;
  }
}

/**
 * V1 APIs for interacting with Hub Events.
 */
class EventsV1 {
  constructor(private client: AxiosInstance, private parent: HyperSnapClient) {}

  /**
   * Stream or poll hub events for a specific shard.
   * @param params Query parameters including shard_index (1 to numShards).
   */
  async getEvents(params: {
    from_event_id?: number;
    shard_index: number;
    stop_id?: number;
  }): Promise<Types.V1.EventsResponse> {
    const { data } = await this.client.get("/v1/events", { params });
    return data;
  }

  /**
   * Retrieve a specific hub event by its ID and shard index.
   */
  async getEventById(event_id: number, shard_index: number): Promise<Types.V1.HubEvent> {
    const { data } = await this.client.get("/v1/eventById", {
      params: { event_id, shard_index },
    });
    return data;
  }
}

/**
 * V1 APIs for Hub network information.
 */
class NetworkV1 {
  constructor(private client: AxiosInstance, private parent: HyperSnapClient) {}

  /**
   * Get general information about the Hub.
   * This updates the client's internal shard count.
   */
  async getInfo(): Promise<Types.V1.InfoResponse> {
    const { data } = await this.client.get("/v1/info");
    this.parent.numShards = data.numShards;
    return data;
  }

  /**
   * Retrieve the list of currently connected gossip peers.
   */
  async getPeers(): Promise<Types.V1.GetConnectedPeersResponse> {
    const { data } = await this.client.get("/v1/currentPeers");
    return data;
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

  constructor(client: AxiosInstance) {
    this.social = new SocialV2(client);
    this.channels = new ChannelsV2(client);
    this.search = new SearchV2(client);
    this.conversations = new ConversationsV2(client);
    this.feeds = new FeedsV2(client);
  }
}

class SocialV2 {
  constructor(private client: AxiosInstance) {}
  async getFollowers(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FollowersResponse> {
    const { data } = await this.client.get("/v2/farcaster/followers", { params: { fid, cursor, limit } });
    return data;
  }
  async getFollowing(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FollowersResponse> {
    const { data } = await this.client.get("/v2/farcaster/following", { params: { fid, cursor, limit } });
    return data;
  }
}

class ChannelsV2 {
  constructor(private client: AxiosInstance) {}
  async getInfo(id: string, type: "id" | "parent_url" = "id"): Promise<Types.V2.ChannelResponse> {
    const { data } = await this.client.get("/v2/farcaster/channel", { params: { id, type } });
    return data;
  }
  async getMembers(channel_id: string, cursor?: string, limit?: number): Promise<Types.V2.ChannelMemberListResponse> {
    const { data } = await this.client.get("/v2/farcaster/channel/member/list", { params: { channel_id, cursor, limit } });
    return data;
  }
}

class SearchV2 {
  constructor(private client: AxiosInstance) {}
  async searchCasts(q: string, cursor?: string, limit?: number): Promise<Types.V2.CastsSearchResponse> {
    const { data } = await this.client.get("/v2/farcaster/cast/search", { params: { q, cursor, limit } });
    return data;
  }
}

class ConversationsV2 {
  constructor(private client: AxiosInstance) {}
  async getConversation(identifier: string, type: "hash" | "url", reply_depth?: number): Promise<Types.V2.ConversationResponse> {
    const { data } = await this.client.get("/v2/farcaster/cast/conversation", { params: { identifier, type, reply_depth } });
    return data;
  }
}

class FeedsV2 {
  constructor(private client: AxiosInstance) {}
  async getFollowingFeed(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FeedResponse> {
    const { data } = await this.client.get("/v2/farcaster/feed/following", { params: { fid, cursor, limit } });
    return data;
  }
  async getTrendingFeed(time_window?: string, cursor?: string, limit?: number): Promise<Types.V2.FeedResponse> {
    const { data } = await this.client.get("/v2/farcaster/feed/trending", { params: { time_window, cursor, limit } });
    return data;
  }
}
