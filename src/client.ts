import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import * as Types from "./types.ts";

export class HyperSnapClient {
  private axios: AxiosInstance;
  public v1: V1Namespace;
  public v2: V2Namespace;

  constructor(baseURL: string, config?: AxiosRequestConfig) {
    this.axios = axios.create({
      baseURL,
      ...config,
    });

    this.v1 = new V1Namespace(this.axios);
    this.v2 = new V2Namespace(this.axios);
  }
}

class V1Namespace {
  public casts: CastsV1;
  public reactions: ReactionsV1;
  public links: LinksV1;
  public users: UsersV1;
  public events: EventsV1;
  public network: NetworkV1;

  constructor(client: AxiosInstance) {
    this.casts = new CastsV1(client);
    this.reactions = new ReactionsV1(client);
    this.links = new LinksV1(client);
    this.users = new UsersV1(client);
    this.events = new EventsV1(client);
    this.network = new NetworkV1(client);
  }

  async getInfo(): Promise<Types.V1.InfoResponse> {
    const res = await this.network.getInfo();
    return res;
  }
}

class CastsV1 {
  constructor(private client: AxiosInstance) {}

  async getById(fid: number, hash: string): Promise<Types.V1.Message> {
    const { data } = await this.client.get("/v1/castById", {
      params: { fid, hash },
    });
    return data;
  }

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

  async getByMention(fid: number): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/castsByMention", {
      params: { fid },
    });
    return data;
  }

  async getByParent(params: {
    fid?: number;
    hash?: string;
    url?: string;
  }): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/castsByParent", { params });
    return data;
  }
}

class ReactionsV1 {
  constructor(private client: AxiosInstance) {}

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

  async getByFid(fid: number, reaction_type: number): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/reactionsByFid", {
      params: { fid, reaction_type },
    });
    return data;
  }

  async getByCast(target_fid: number, target_hash: string): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/reactionsByCast", {
      params: { target_fid, target_hash },
    });
    return data;
  }
}

class LinksV1 {
  constructor(private client: AxiosInstance) {}

  async getById(fid: number, link_type: string, target_fid?: number): Promise<Types.V1.Message> {
    const { data } = await this.client.get("/v1/linkById", {
      params: { fid, link_type, target_fid },
    });
    return data;
  }

  async getByFid(fid: number, link_type?: string): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/linksByFid", {
      params: { fid, link_type },
    });
    return data;
  }
}

class UsersV1 {
  constructor(private client: AxiosInstance) {}

  async getDataByFid(fid: number): Promise<Types.V1.PagedResponse> {
    const { data } = await this.client.get("/v1/userDataByFid", { params: { fid } });
    return data;
  }

  async getStorageLimits(fid: number): Promise<Types.V1.StorageLimitsResponse> {
    const { data } = await this.client.get("/v1/storageLimitsByFid", {
      params: { fid },
    });
    return data;
  }

  async getFidByName(name: string, type?: string): Promise<Types.V1.FidResponse> {
    const { data } = await this.client.get("/v1/fidByName", {
      params: { name, type },
    });
    return data;
  }

  async getAddressesByName(name: string, type?: string): Promise<Types.V1.NameToAddressResponse> {
    const { data } = await this.client.get("/v1/addressesByName", {
      params: { name, type },
    });
    return data;
  }

  async getFidByAddress(address: string): Promise<Types.V1.AddressToFidResponse> {
    const { data } = await this.client.get("/v1/fidByAddress", {
      params: { address },
    });
    return data;
  }
}

class EventsV1 {
  constructor(private client: AxiosInstance) {}

  async getEvents(params: {
    from_event_id?: number;
    shard_index?: number;
    stop_id?: number;
  }): Promise<Types.V1.EventsResponse> {
    const { data } = await this.client.get("/v1/events", { params });
    return data;
  }

  async getEventById(event_id: number, shard_index: number): Promise<Types.V1.HubEvent> {
    const { data } = await this.client.get("/v1/eventById", {
      params: { event_id, shard_index },
    });
    return data;
  }
}

class NetworkV1 {
  constructor(private client: AxiosInstance) {}

  async getInfo(): Promise<Types.V1.InfoResponse> {
    const { data } = await this.client.get("/v1/info");
    return data;
  }

  async getPeers(): Promise<Types.V1.GetConnectedPeersResponse> {
    const { data } = await this.client.get("/v1/currentPeers");
    return data;
  }
}

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
    const { data } = await this.client.get("/v2/farcaster/followers", {
      params: { fid, cursor, limit },
    });
    return data;
  }

  async getFollowing(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FollowersResponse> {
    const { data } = await this.client.get("/v2/farcaster/following", {
      params: { fid, cursor, limit },
    });
    return data;
  }
}

class ChannelsV2 {
  constructor(private client: AxiosInstance) {}

  async getInfo(id: string, type: "id" | "parent_url" = "id"): Promise<Types.V2.ChannelResponse> {
    const { data } = await this.client.get("/v2/farcaster/channel", {
      params: { id, type },
    });
    return data;
  }

  async getMembers(channel_id: string, cursor?: string, limit?: number): Promise<Types.V2.ChannelMemberListResponse> {
    const { data } = await this.client.get("/v2/farcaster/channel/member/list", {
      params: { channel_id, cursor, limit },
    });
    return data;
  }
}

class SearchV2 {
  constructor(private client: AxiosInstance) {}

  async searchCasts(q: string, cursor?: string, limit?: number): Promise<Types.V2.CastsSearchResponse> {
    const { data } = await this.client.get("/v2/farcaster/cast/search", {
      params: { q, cursor, limit },
    });
    return data;
  }
}

class ConversationsV2 {
  constructor(private client: AxiosInstance) {}

  async getConversation(identifier: string, type: "hash" | "url", reply_depth?: number): Promise<Types.V2.ConversationResponse> {
    const { data } = await this.client.get("/v2/farcaster/cast/conversation", {
      params: { identifier, type, reply_depth },
    });
    return data;
  }
}

class FeedsV2 {
  constructor(private client: AxiosInstance) {}

  async getFollowingFeed(fid: number, cursor?: string, limit?: number): Promise<Types.V2.FeedResponse> {
    const { data } = await this.client.get("/v2/farcaster/feed/following", {
      params: { fid, cursor, limit },
    });
    return data;
  }

  async getTrendingFeed(time_window?: string, cursor?: string, limit?: number): Promise<Types.V2.FeedResponse> {
    const { data } = await this.client.get("/v2/farcaster/feed/trending", {
      params: { time_window, cursor, limit },
    });
    return data;
  }
}
