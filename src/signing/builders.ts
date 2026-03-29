import type { Hex } from "viem";
import { hexToBytes } from "viem";
import { encodeSignedMessage } from "./encode.ts";
import type { Ed25519SecretKey } from "./ed25519_signer.ts";
import type { MessageDataJson } from "./encode.ts";

/** `FarcasterNetwork` enum value from `message.proto`: 1 = MAINNET, 2 = TESTNET, 3 = DEVNET. */
export type FarcasterNetworkId = 1 | 2 | 3;

/** Converts a cast hash from viem hex to 20 raw bytes for protobuf `CastId.hash` / `target_hash`. */
function castHashToBytes(hash: Hex): Uint8Array {
  const b = hexToBytes(hash);
  if (b.length !== 20) {
    throw new Error("Cast hash must be 20 bytes (40 hex chars)");
  }
  return b;
}

/** Parameters for a `MESSAGE_TYPE_CAST_ADD` body. */
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
  /** `CastType` enum: `0` = CAST, `1` = LONG_CAST, `2` = TEN_K_CAST */
  castType?: number;
}

/**
 * Builds protobuf-json `MessageData` for a new cast (`MESSAGE_TYPE_CAST_ADD`).
 *
 * @param params - FID, network, Farcaster timestamp, text, optional embeds/parent.
 * @returns Object suitable for `encodeSignedMessage`.
 */
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

/** Parameters for `MESSAGE_TYPE_CAST_REMOVE`. */
export interface CastRemoveParams {
  fid: number;
  network: FarcasterNetworkId;
  timestamp: number;
  targetCastHash: Hex;
}

/**
 * Builds `MessageData` to delete a cast by hash (`MESSAGE_TYPE_CAST_REMOVE`).
 *
 * @param params - Author FID, network, timestamp, and 20-byte cast hash to remove.
 */
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

/** Parameters for reaction add/remove (`MESSAGE_TYPE_REACTION_ADD` or `_REMOVE`). */
export interface ReactionParams {
  fid: number;
  network: FarcasterNetworkId;
  timestamp: number;
  /** `ReactionType`: `1` = LIKE, `2` = RECAST */
  reactionType: 1 | 2;
  targetCastId: { fid: number; hash: Hex };
  /** `3` = REACTION_ADD, `4` = REACTION_REMOVE */
  messageType: 3 | 4;
}

/**
 * Builds `MessageData` for a like/recast on a cast.
 *
 * @param params - Includes whether this is add or remove via `messageType`.
 */
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

/** Parameters for link add/remove (e.g. follow, block). */
export interface LinkParams {
  fid: number;
  network: FarcasterNetworkId;
  timestamp: number;
  /** Link type string, max 8 chars (e.g. `"follow"`, `"block"`). */
  linkType: string;
  targetFid: number;
  /** `5` = LINK_ADD, `6` = LINK_REMOVE */
  messageType: 5 | 6;
  displayTimestamp?: number;
}

/**
 * Builds `MessageData` for a social link between FIDs (`MESSAGE_TYPE_LINK_ADD` or `_LINK_REMOVE`).
 *
 * @param params - `linkType` distinguishes follow vs block etc.; `messageType` selects add vs remove.
 */
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

/** Numeric `UserDataType` values from `message.proto` (display name, bio, PFP URL, etc.). */
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

/** Parameters for `MESSAGE_TYPE_USER_DATA_ADD`. */
export interface UserDataAddParams {
  fid: number;
  network: FarcasterNetworkId;
  timestamp: number;
  userDataType: UserDataTypeNumber;
  value: string;
}

/**
 * Builds `MessageData` for profile metadata (`MESSAGE_TYPE_USER_DATA_ADD`).
 *
 * @param params - `userDataType` matches protobuf `UserDataType` numeric values.
 */
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

/**
 * Convenience: `buildCastAddMessageData` then `encodeSignedMessage`.
 *
 * @returns Full `Message` protobuf bytes.
 */
export async function signCastAdd(params: CastAddParams, secretKey: Ed25519SecretKey): Promise<Uint8Array> {
  return encodeSignedMessage(buildCastAddMessageData(params), secretKey);
}

/**
 * Convenience: `buildCastRemoveMessageData` then `encodeSignedMessage`.
 */
export async function signCastRemove(params: CastRemoveParams, secretKey: Ed25519SecretKey): Promise<Uint8Array> {
  return encodeSignedMessage(buildCastRemoveMessageData(params), secretKey);
}

/**
 * Convenience: `buildReactionMessageData` then `encodeSignedMessage`.
 */
export async function signReaction(params: ReactionParams, secretKey: Ed25519SecretKey): Promise<Uint8Array> {
  return encodeSignedMessage(buildReactionMessageData(params), secretKey);
}

/**
 * Convenience: `buildLinkMessageData` then `encodeSignedMessage`.
 */
export async function signLink(params: LinkParams, secretKey: Ed25519SecretKey): Promise<Uint8Array> {
  return encodeSignedMessage(buildLinkMessageData(params), secretKey);
}

/**
 * Convenience: `buildUserDataAddMessageData` then `encodeSignedMessage`.
 */
export async function signUserDataAdd(
  params: UserDataAddParams,
  secretKey: Ed25519SecretKey,
): Promise<Uint8Array> {
  return encodeSignedMessage(buildUserDataAddMessageData(params), secretKey);
}
