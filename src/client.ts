import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import * as Types from "./types.ts";

/**
 * HyperSnapClient is the main entry point for the HyperSnap SDK.
 * It provides access to both V1 (Hubble-compatible) and V2 (Farcaster API compatibility) namespaces.
 */
export class HyperSnapClient {
  private axios: AxiosInstance;
  /** Namespace for Hubble-compatible Hub V1 APIs */
  public v1: V1Namespace;
  /** Namespace for Farcaster API V2 compatibility APIs */
  public v2: V2Namespace;

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

    this.v1 = new V1Namespace(this.axios);
    this.v2 = new V2Namespace(this.axios);
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

  constructor(client: AxiosInstance) {
    this.casts = new CastsV1(client);
    this.reactions = new ReactionsV1(client);
    this.links = new LinksV1(client);
    this.users = new UsersV1(client);
    this.events = new EventsV1(client);
    this.network = new NetworkV1(client);
  }

  /**
   * Get general information about the Hub.
   * @returns A promise that resolves to the Hub info response
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
  constructor(private client: AxiosInstance) {}

  /**
   * Retrieve a specific cast by its FID and hash.
   * @param fid The FID of the cast author
   * @param hash The hex-encoded hash of the cast
   * @returns A promise that resolves to the cast message
   */
  async getById(fid: number, hash: string): Promise<Types.V1.Message> {
    const { data } = await this.client.get("/v1/castById", {
      params: { fid, hash },
    });
    return data;
  }

  /**
   * Retrieve all casts authored by a specific FID.
   * @param params Query parameters including FID, pagination, and time range
   * @returns A promise that resolves to a paged response of cast messages
   */
  async getByFid(params: {
    fid: number;
    start_timestamp?: number;
    stop_timestamp?: number;
    page_size?: number;
    page_token?: string;
    reverse?: boolean;
  }): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/castsByFid", { params });
    return data;
  }

  /**
   * Retrieve all casts that mention a specific FID.
   * @param fid The FID that is mentioned
   * @returns A promise that resolves to a paged response of cast messages
   */
  async getByMention(fid: number): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/castsByMention", {
      params: { fid },
    });
    return data;
  }

  /**
   * Retrieve all casts that are replies to a specific parent cast or URL.
   * @param params Query parameters including parent FID, hash, or URL
   * @returns A promise that resolves to a paged response of cast messages
   */
  async getByParent(params: {
    fid?: number;
    hash?: string;
    url?: string;
  }): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/castsByParent", { params });
    return data;
  }
}

/**
 * V1 APIs for interacting with Reactions.
 */
class ReactionsV1 {
  constructor(private client: AxiosInstance) {}

  /**
   * Retrieve a specific reaction by FID and target.
   * @param params Query parameters including FID, reaction type, and target FID/hash/URL
   * @returns A promise that resolves to the reaction message
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
   * @param fid The FID of the reactor
   * @param reaction_type The type of reaction (e.g., 1 for Like, 2 for Recast)
   * @returns A promise that resolves to a paged response of reaction messages
   */
  async getByFid(fid: number, reaction_type: number): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/reactionsByFid", {
      params: { fid, reaction_type },
    });
    return data;
  }

  /**
   * Retrieve all reactions for a specific cast.
   * @param target_fid The FID of the cast author
   * @param target_hash The hex-encoded hash of the cast
   * @returns A promise that resolves to a paged response of reaction messages
   */
  async getByCast(target_fid: number, target_hash: string): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/reactionsByCast", {
      params: { target_fid, target_hash },
    });
    return data;
  }
}

/**
 * V1 APIs for interacting with Links (e.g., follows).
 */
class LinksV1 {
  constructor(private client: AxiosInstance) {}

  /**
   * Retrieve a specific link by FID, type, and target.
   * @param fid The FID of the link creator
   * @param link_type The type of link (e.g., "follow")
   * @param target_fid The FID of the link target
   * @returns A promise that resolves to the link message
   */
  async getById(fid: number, link_type: string, target_fid?: number): Promise<Types.V1.Message> {
    const { data } = await this.client.get("/v1/linkById", {
      params: { fid, link_type, target_fid },
    });
    return data;
  }

  /**
   * Retrieve all links authored by a specific FID.
   * @param fid The FID of the link creator
   * @param link_type Optional filter for link type
   * @returns A promise that resolves to a paged response of link messages
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
  constructor(private client: AxiosInstance) {}

  /**
   * Retrieve user data (pfp, bio, etc.) for a specific FID.
   * @param fid The FID of the user
   * @returns A promise that resolves to a paged response of user data messages
   */
  async getDataByFid(fid: number): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/userDataByFid", { params: { fid } });
    return data;
  }

  /**
   * Retrieve storage limits and usage for a specific FID.
   * @param fid The FID of the user
   * @returns A promise that resolves to the storage limits response
   */
  async getStorageLimits(fid: number): Promise<Types.V1.StorageLimitsResponse> {
    const { data } = await this.client.get("/v1/storageLimitsByFid", {
      params: { fid },
    });
    return data;
  }

  /**
   * Look up an FID by a username (fname, ens, or basename).
   * @param name The username to look up
   * @param type Optional username type ("fname", "ens", or "basename")
   * @returns A promise that resolves to the FID response
   */
  async getFidByName(name: string, type?: string): Promise<Types.V1.FidResponse> {
    const { data } = await this.client.get("/v1/fidByName", {
      params: { name, type },
    });
    return data;
  }

  /**
   * Retrieve connected addresses (custody and verified) for a username.
   * @param name The username to look up
   * @param type Optional username type
   * @returns A promise that resolves to the addresses response
   */
  async getAddressesByName(name: string, type?: string): Promise<Types.V1.NameToAddressResponse> {
    const { data } = await this.client.get("/v1/addressesByName", {
      params: { name, type },
    });
    return data;
  }

  /**
   * Look up FIDs associated with a specific Ethereum or Solana address.
   * @param address The hex-encoded (ETH) or base58-encoded (SOL) address
   * @returns A promise that resolves to the address-to-FID mapping
   */
  async getFidByAddress(address: string): Promise<Types.V1.AddressToFidResponse> {
    const { data } = await this.client.get("/v1/fidByAddress", {
      params: { address },
    });
    return data;
  }
}

/**
 * V1 APIs for interacting with Hub Events.
 */
class EventsV1 {
  constructor(private client: AxiosInstance) {}

  /**
   * Stream or poll hub events starting from a specific event ID.
   * @param params Query parameters including start ID, shard index, and stop ID
   * @returns A promise that resolves to the events response
   */
  async getEvents(params: {
    from_event_id?: number;
    shard_index?: number;
    stop_id?: number;
  }): Promise<Types.V1.EventsResponse> {
    const { data } = await this.client.get("/v1/events", { params });
    return data;
  }

  /**
   * Retrieve a specific hub event by its ID and shard index.
   * @param event_id The ID of the event
   * @param shard_index The shard index where the event occurred
   * @returns A promise that resolves to the hub event
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
  constructor(private client: AxiosInstance) {}

  /**
   * Get general information about the Hub (version, stats, etc.).
   * @returns A promise that resolves to the Hub info response
   */
  async getInfo(): Promise<Types.V1.InfoResponse> {
    const { data } = await this.client.get("/v1/info");
    return data;
  }

  /**
   * Retrieve the list of currently connected gossip peers.
   * @returns A promise that resolves to the connected peers response
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
  /** APIs for social graph (followers/following) */
  public social: SocialV2;
  /** APIs for Channels */
  public channels: ChannelsV2;
  /** APIs for Cast search */
  public search: SearchV2;
  /** APIs for Conversation threads */
  public conversations: ConversationsV2;
  /** APIs for Content Feeds */
  public feeds: FeedsV2;

  constructor(client: AxiosInstance) {
    this.social = new SocialV2(client);
    this.channels = new ChannelsV2(client);
    this.search = new SearchV2(client);
    this.conversations = new ConversationsV2(client);
    this.feeds = new FeedsV2(client);
  }
}

/**
 * V2 APIs for social graph (followers/following).
 */
class SocialV2 {
  constructor(private client: AxiosInstance) {}

  /**
   * Get a paged list of followers for a specific user.
   * @param fid The FID of the user
   * @param cursor Optional pagination cursor
   * @param limit Optional limit (default 25, max 100)
   * @returns A promise that resolves to the followers response
   */
  async getFollowers(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FollowersResponse> {
    const { data } = await this.client.get("/v2/farcaster/followers", {
      params: { fid, cursor, limit },
    });
    return data;
  }

  /**
   * Get a paged list of users that a specific user is following.
   * @param fid The FID of the user
   * @param cursor Optional pagination cursor
   * @param limit Optional limit (default 25, max 100)
   * @returns A promise that resolves to the followers response (following list)
   */
  async getFollowing(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FollowersResponse> {
    const { data } = await this.client.get("/v2/farcaster/following", {
      params: { fid, cursor, limit },
    });
    return data;
  }
}

/**
 * V2 APIs for Channels.
 */
class ChannelsV2 {
  constructor(private client: AxiosInstance) {}

  /**
   * Get information about a specific channel.
   * @param id The channel ID or parent URL
   * @param type The type of identifier ("id" or "parent_url")
   * @returns A promise that resolves to the channel response
   */
  async getInfo(id: string, type: "id" | "parent_url" = "id"): Promise<Types.V2.ChannelResponse> {
    const { data } = await this.client.get("/v2/farcaster/channel", {
      params: { id, type },
    });
    return data;
  }

  /**
   * Get a paged list of members in a specific channel.
   * @param channel_id The ID of the channel
   * @param cursor Optional pagination cursor
   * @param limit Optional limit
   * @returns A promise that resolves to the channel member list response
   */
  async getMembers(channel_id: string, cursor?: string, limit?: number): Promise<Types.V2.ChannelMemberListResponse> {
    const { data } = await this.client.get("/v2/farcaster/channel/member/list", {
      params: { channel_id, cursor, limit },
    });
    return data;
  }
}

/**
 * V2 APIs for Cast search.
 */
class SearchV2 {
  constructor(private client: AxiosInstance) {}

  /**
   * Search for casts using a text query.
   * @param q The search query string
   * @param cursor Optional pagination cursor
   * @param limit Optional limit
   * @returns A promise that resolves to the cast search response
   */
  async searchCasts(q: string, cursor?: string, limit?: number): Promise<Types.V2.CastsSearchResponse> {
    const { data } = await this.client.get("/v2/farcaster/cast/search", {
      params: { q, cursor, limit },
    });
    return data;
  }
}

/**
 * V2 APIs for Conversation threads.
 */
class ConversationsV2 {
  constructor(private client: AxiosInstance) {}

  /**
   * Retrieve a full conversation thread starting from a specific cast.
   * @param identifier The hex-encoded hash or Warpcast URL of the cast
   * @param type The type of identifier ("hash" or "url")
   * @param reply_depth Optional depth of replies to fetch (max 5)
   * @returns A promise that resolves to the conversation response
   */
  async getConversation(identifier: string, type: "hash" | "url", reply_depth?: number): Promise<Types.V2.ConversationResponse> {
    const { data } = await this.client.get("/v2/farcaster/cast/conversation", {
      params: { identifier, type, reply_depth },
    });
    return data;
  }
}

/**
 * V2 APIs for Content Feeds.
 */
class FeedsV2 {
  constructor(private client: AxiosInstance) {}

  /**
   * Get the following feed for a specific user (casts from people they follow).
   * @param fid The FID of the user
   * @param cursor Optional pagination cursor
   * @param limit Optional limit
   * @returns A promise that resolves to the feed response
   */
  async getFollowingFeed(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FeedResponse> {
    const { data } = await this.client.get("/v2/farcaster/feed/following", {
      params: { fid, cursor, limit },
    });
    return data;
  }

  /**
   * Get the trending feed of high-engagement casts.
   * @param time_window Optional time window for trending (e.g., "24h", "7d")
   * @param cursor Optional pagination cursor
   * @param limit Optional limit
   * @returns A promise that resolves to the feed response
   */
  async getTrendingFeed(time_window?: string, cursor?: string, limit?: number): Promise<Types.V2.FeedResponse> {
    const { data } = await this.client.get("/v2/farcaster/feed/trending", {
      params: { time_window, cursor, limit },
    });
    return data;
  }
}

