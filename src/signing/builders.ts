import type { Hex } from "viem";
import { hexToBytes } from "viem";
import { encodeSignedMessage } from "./encode.ts";
import type { Ed25519SecretKey } from "./ed25519_signer.ts";
import type { MessageDataJson } from "./encode.ts";

export type FarcasterNetworkId = 1 | 2 | 3;

function castHashToBytes(hash: Hex): Uint8Array {
  const b = hexToBytes(hash);
  if (b.length !== 20) {
    throw new Error("Cast hash must be 20 bytes (40 hex chars)");
  }
  return b;
}

export interface CastAddParams {
  fid: number;
  network: FarcasterNetworkId;
  timestamp: number;
  text: string;
  mentions?: number[];
  mentionsPositions?: number[];
  embedsDeprecated?: string[];
  embeds?: Array<{ url: string } | { castId: { fid: number; hash: Hex } }>;
  parentCastId?: { fid: number; hash: Hex };
  parentUrl?: string;
  /** 0 = CAST, 1 = LONG_CAST, 2 = TEN_K_CAST */
  castType?: number;
}

export function buildCastAddMessageData(params: CastAddParams): MessageDataJson {
  const embeds = (params.embeds ?? []).map((e) => {
    if ("url" in e) {
      return { url: e.url };
    }
    return {
      cast_id: {
        fid: e.castId.fid,
        hash: castHashToBytes(e.castId.hash),
      },
    };
  });

  const body: MessageDataJson = {
    type: 1, // MESSAGE_TYPE_CAST_ADD
    fid: params.fid,
    timestamp: params.timestamp,
    network: params.network,
    cast_add_body: {
      embeds_deprecated: params.embedsDeprecated ?? [],
      mentions: params.mentions ?? [],
      mentions_positions: params.mentionsPositions ?? [],
      embeds,
      text: params.text,
      type: params.castType ?? 0,
    },
  };

  if (params.parentCastId) {
    (body.cast_add_body as Record<string, unknown>).parent_cast_id = {
      fid: params.parentCastId.fid,
      hash: castHashToBytes(params.parentCastId.hash),
    };
  } else if (params.parentUrl !== undefined) {
    (body.cast_add_body as Record<string, unknown>).parent_url = params.parentUrl;
  }

  return body;
}

export interface CastRemoveParams {
  fid: number;
  network: FarcasterNetworkId;
  timestamp: number;
  targetCastHash: Hex;
}

export function buildCastRemoveMessageData(params: CastRemoveParams): MessageDataJson {
  return {
    type: 2, // MESSAGE_TYPE_CAST_REMOVE
    fid: params.fid,
    timestamp: params.timestamp,
    network: params.network,
    cast_remove_body: {
      target_hash: castHashToBytes(params.targetCastHash),
    },
  };
}

export interface ReactionParams {
  fid: number;
  network: FarcasterNetworkId;
  timestamp: number;
  /** 1 = LIKE, 2 = RECAST */
  reactionType: 1 | 2;
  targetCastId: { fid: number; hash: Hex };
  messageType: 3 | 4; // REACTION_ADD | REACTION_REMOVE
}

export function buildReactionMessageData(params: ReactionParams): MessageDataJson {
  return {
    type: params.messageType,
    fid: params.fid,
    timestamp: params.timestamp,
    network: params.network,
    reaction_body: {
      type: params.reactionType,
      target_cast_id: {
        fid: params.targetCastId.fid,
        hash: castHashToBytes(params.targetCastId.hash),
      },
    },
  };
}

export interface LinkParams {
  fid: number;
  network: FarcasterNetworkId;
  timestamp: number;
  linkType: string;
  targetFid: number;
  messageType: 5 | 6; // LINK_ADD | LINK_REMOVE
  displayTimestamp?: number;
}

export function buildLinkMessageData(params: LinkParams): MessageDataJson {
  const link: Record<string, unknown> = {
    type: params.linkType,
    target_fid: params.targetFid,
  };
  if (params.displayTimestamp !== undefined) {
    link.displayTimestamp = params.displayTimestamp;
  }
  return {
    type: params.messageType,
    fid: params.fid,
    timestamp: params.timestamp,
    network: params.network,
    link_body: link,
  };
}

/** User data type enum values from `UserDataType` in message.proto */
export type UserDataTypeNumber =
  | 1
  | 2
  | 3
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13;

export interface UserDataAddParams {
  fid: number;
  network: FarcasterNetworkId;
  timestamp: number;
  userDataType: UserDataTypeNumber;
  value: string;
}

export function buildUserDataAddMessageData(params: UserDataAddParams): MessageDataJson {
  return {
    type: 11, // MESSAGE_TYPE_USER_DATA_ADD
    fid: params.fid,
    timestamp: params.timestamp,
    network: params.network,
    user_data_body: {
      type: params.userDataType,
      value: params.value,
    },
  };
}

export async function signCastAdd(params: CastAddParams, secretKey: Ed25519SecretKey): Promise<Uint8Array> {
  return encodeSignedMessage(buildCastAddMessageData(params), secretKey);
}

export async function signCastRemove(params: CastRemoveParams, secretKey: Ed25519SecretKey): Promise<Uint8Array> {
  return encodeSignedMessage(buildCastRemoveMessageData(params), secretKey);
}

export async function signReaction(params: ReactionParams, secretKey: Ed25519SecretKey): Promise<Uint8Array> {
  return encodeSignedMessage(buildReactionMessageData(params), secretKey);
}

export async function signLink(params: LinkParams, secretKey: Ed25519SecretKey): Promise<Uint8Array> {
  return encodeSignedMessage(buildLinkMessageData(params), secretKey);
}

export async function signUserDataAdd(
  params: UserDataAddParams,
  secretKey: Ed25519SecretKey,
): Promise<Uint8Array> {
  return encodeSignedMessage(buildUserDataAddMessageData(params), secretKey);
}
