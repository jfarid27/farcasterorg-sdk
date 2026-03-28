// V1 Shared Types (Hub)
export namespace V1 {
  export interface InfoResponse {
    dbStats?: DbStats;
    numShards: number;
    shardInfos: ShardInfo[];
    version: string;
    peer_id: string;
    nextEngineVersionTimestamp: number;
  }

  export interface DbStats {
    numMessages: number;
    numFidRegistrations: number;
    approxSize: number;
  }

  export interface ShardInfo {
    shardId: number;
    maxHeight: number;
    numMessages: number;
    numFidRegistrations: number;
    approxSize: number;
    blockDelay: number;
    mempoolSize: number;
  }

  export interface Message {
    data: MessageData;
    hash: string;
    hashScheme: string;
    signature: string; // Base64
    signatureScheme: string;
    signer: string;
  }

  export interface MessageData {
    type: string;
    fid: number;
    timestamp: number;
    network: string;
    castAddBody?: CastAddBody;
    castRemoveBody?: CastRemoveBody;
    reactionBody?: ReactionBody;
    verificationAddAddressBody?: VerificationAddAddressBody;
    verificationRemoveBody?: VerificationRemoveBody;
    userDataBody?: UserDataBody;
    linkBody?: LinkBody;
    usernameProofBody?: UsernameProofBody;
    frameActionBody?: FrameActionBody;
    linkCompactStateBody?: LinkCompactStateBody;
    lendStorageBody?: LendStorageBody;
  }

  export interface CastId {
    fid: number;
    hash: string;
  }

  export interface CastAddBody {
    embedsDeprecated: string[];
    mentions: number[];
    parentCastId?: CastId;
    parentUrl?: string;
    text: string;
    embeds: Array<{ url: string } | { castId: CastId }>;
    mentionsPositions: number[];
    type: string;
  }

  export interface CastRemoveBody {
    targetHash: string;
  }

  export interface ReactionBody {
    type: string;
    targetCastId?: CastId;
    targetUrl?: string;
  }

  export interface VerificationAddAddressBody {
    address: string;
    claimSignature: string;
    blockHash: string;
    type: number;
    chainId: number;
    protocol: string;
  }

  export interface VerificationRemoveBody {
    address: string;
    protocol: string;
  }

  export interface UserDataBody {
    type: string;
    value: string;
  }

  export interface LinkBody {
    type: string;
    displayTimestamp?: number;
    targetFid: number;
  }

  export interface UsernameProofBody {
    timestamp: number;
    name: string;
    owner: string;
    signature: string;
    fid: number;
    type: string;
  }

  export interface FrameActionBody {
    url: string;
    buttonIndex: number;
    castId?: CastId;
    inputText: string;
    state: string;
    transactionId: string;
    address: string;
  }

  export interface LinkCompactStateBody {
    type: string;
    targetFids: number[];
  }

  export interface LendStorageBody {
    toFid: number;
    numUnits: number;
    unitType: number;
  }

  export interface PagedResponse {
    messages: Message[];
    nextPageToken?: string;
  }

  export interface GetFidsResponse {
    fids: number[];
    nextPageToken?: string;
  }

  export interface StorageLimit {
    storeType: number;
    name: string;
    limit: number;
    used: number;
    earliestTimestamp: number;
    earliestHash: string;
  }

  export interface StorageLimitsResponse {
    limits: StorageLimit[];
    units: number;
    unitDetails: Array<{ unitType: number; unitSize: number }>;
    tier_subscriptions: Array<{ tier_type: number; expires_at: number }>;
  }

  export interface UserNameProof {
    timestamp: number;
    name: string;
    owner: string;
    signature: string;
    fid: number;
    type: string;
  }

  export interface UsernameProofsResponse {
    proofs: UserNameProof[];
  }

  export interface FidResponse {
    fid: number;
  }

  export interface NameToAddressResponse {
    fid: number;
    custodyAddress?: string;
    connectedAddresses: string[];
  }

  export interface AddressMatch {
    fid: number;
    isCustody: boolean;
    isVerified: boolean;
  }

  export interface AddressToFidResponse {
    matches: AddressMatch[];
  }

  export interface ValidationResult {
    valid: boolean;
    message?: Message;
  }

  export interface MessageError {
    hash: string;
    errCode: string;
    message: string;
  }

  export interface SubmitBulkMessagesResponse {
    messages: Array<Message | MessageError>;
  }

  export interface OnChainEvent {
    type: number;
    chainId: number;
    blockNumber: number;
    blockHash: string;
    blockTimestamp: number;
    transactionHash: string;
    logIndex: number;
    fid: number;
    // ... bodies
  }

  export interface OnChainEventResponse {
    events: OnChainEvent[];
    nextPageToken?: string;
  }

  export interface FidAddressTypeResponse {
    is_custody: boolean;
    is_auth: boolean;
    is_verified: boolean;
  }

  export interface HubEvent {
    type: string;
    id: number;
    blockNumber: number;
    shardIndex: number;
    // ... bodies
  }

  export interface EventsResponse {
    events: HubEvent[];
  }

  export interface ContactInfoBody {
    gossip_address: string;
    announce_rpc_address: string;
    peer_id: string;
    snapchain_version: string;
    network: number;
    timestamp: number;
    capabilities: string[];
  }

  export interface GetConnectedPeersResponse {
    contacts: ContactInfoBody[];
  }
}

// V2 Shared Types (Farcaster API Compatibility)
export namespace V2 {
  export interface User {
    object: "user";
    fid: number;
    username: string;
    display_name?: string;
    custody_address: string;
    pfp_url?: string;
    profile: {
      bio: { text: string };
    };
    follower_count: number;
    following_count: number;
    verifications: string[];
    verified_addresses: {
      eth_addresses: string[];
      sol_addresses: string[];
    };
    viewer_context?: {
      following: boolean;
      followed_by: boolean;
    };
  }

  export interface Follower {
    object: "follower";
    user: User;
  }

  export interface FollowersResponse {
    users: Follower[];
    next: NextCursor;
  }

  export interface Cast {
    object: "cast";
    hash: string;
    parent_hash?: string;
    parent_url?: string;
    root_parent_url?: string;
    author: User;
    text: string;
    timestamp: string; // ISO-8601
    embeds: Embed[];
    reactions: {
      likes_count: number;
      recasts_count: number;
      likes?: Array<{ fid: number; fname: string }>;
      recasts?: Array<{ fid: number; fname: string }>;
    };
    replies: {
      count: number;
    };
    thread_hash?: string;
    channel?: Channel;
    viewer_context?: {
      liked: boolean;
      recasted: boolean;
    };
  }

  export type Embed = { url: string } | { cast_id: { fid: number; hash: string } };

  export interface Channel {
    object: "channel";
    id: string;
    name: string;
    image_url?: string;
    parent_url?: string;
    description?: string;
    follower_count?: number;
    member_count?: number;
  }

  export interface ChannelResponse {
    channel: Channel;
  }

  export interface ChannelMember {
    object: "channel_member";
    user: User;
    role: string;
  }

  export interface ChannelMemberListResponse {
    members: ChannelMember[];
    next: NextCursor;
  }

  export interface NextCursor {
    cursor?: string;
  }

  export interface CastsSearchResponse {
    result: {
      casts: Cast[];
      next: NextCursor;
    };
  }

  export interface CastWithReplies extends Cast {
    direct_replies: CastWithReplies[];
  }

  export interface ConversationResponse {
    conversation: {
      cast: CastWithReplies;
    };
  }

  export interface FeedResponse {
    casts: Cast[];
    next: NextCursor;
  }

  export interface ErrorResponse {
    message: string;
    code?: string;
  }
}
