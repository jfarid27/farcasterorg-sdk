import type { Hex } from "viem";
import { bytesToHex, hexToBytes } from "viem";
import type protobuf from "protobufjs";
import type * as Types from "../types.ts";
import { getProtoRoot } from "./proto_root.ts";

function b64Encode(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

function b64Decode(s: string): Uint8Array {
  const bin = atob(s.replace(/ /g, "+"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64ToHex0x(b64: string): Hex {
  return bytesToHex(b64Decode(b64)) as Hex;
}

/** Map protobuf `Message` bytes to the JSON shape returned by hub HTTP APIs (e.g. `submitMessage` response). */
export async function protobufMessageBytesToHubJson(bytes: Uint8Array): Promise<Types.V1.Message> {
  const root = await getProtoRoot();
  const Message = root.lookupType("Message");
  const decoded = Message.decode(bytes) as unknown as {
    data: protobuf.Message;
    hash: Uint8Array;
    hashScheme: number;
    signature: Uint8Array;
    signatureScheme: number;
    signer: Uint8Array;
  };

  const MessageData = root.lookupType("MessageData");
  const dataObj = MessageData.toObject(decoded.data, {
    enums: String,
    bytes: String,
    defaults: true,
    longs: String,
  });

  const body = mapMessageDataObjectToHubData(dataObj as Record<string, unknown>);

  return {
    data: body,
    hash: bytesToHex(decoded.hash) as Hex,
    hashScheme: hashSchemeNumToStr(decoded.hashScheme),
    signature: b64Encode(decoded.signature),
    signatureScheme: signatureSchemeNumToStr(decoded.signatureScheme),
    signer: bytesToHex(decoded.signer) as Hex,
  };
}

function hashSchemeNumToStr(n: number): string {
  if (n === 1) return "HASH_SCHEME_BLAKE3";
  return "HASH_SCHEME_NONE";
}

function signatureSchemeNumToStr(n: number): string {
  if (n === 1) return "SIGNATURE_SCHEME_ED25519";
  return "SIGNATURE_SCHEME_NONE";
}

function mapMessageDataObjectToHubData(o: Record<string, unknown>): Types.V1.MessageData {
  const type = String(o.type ?? "");
  const fid = Number(o.fid ?? 0);
  const timestamp = Number(o.timestamp ?? 0);
  const network = String(o.network ?? "");

  const base: Types.V1.MessageData = {
    type,
    fid,
    timestamp,
    network,
  };

  const c = o as Record<string, unknown>;
  if (c.cast_add_body) {
    base.castAddBody = mapCastAdd(c.cast_add_body as Record<string, unknown>);
  }
  if (c.cast_remove_body) {
    base.castRemoveBody = mapCastRemove(c.cast_remove_body as Record<string, unknown>);
  }
  if (c.reaction_body) {
    base.reactionBody = mapReaction(c.reaction_body as Record<string, unknown>);
  }
  if (c.link_body) {
    base.linkBody = mapLink(c.link_body as Record<string, unknown>);
  }
  if (c.user_data_body) {
    base.userDataBody = mapUserData(c.user_data_body as Record<string, unknown>);
  }

  return base;
}

function mapCastAdd(b: Record<string, unknown>): Types.V1.CastAddBody {
  const embedsRaw = (b.embeds ?? []) as Array<Record<string, unknown>>;
  const embeds: Types.V1.CastAddBody["embeds"] = embedsRaw.map((e) => {
    if (e.url !== undefined) return { url: String(e.url) };
    const cid = (e.cast_id ?? e.castId) as Record<string, unknown> | undefined;
    const h = cid?.hash;
    const hashHex = typeof h === "string" && h.includes("=") ? b64ToHex0x(h) : bytesToHex(toU8(h)) as Hex;
    return {
      castId: {
        fid: Number(cid?.fid ?? 0),
        hash: hashHex,
      },
    };
  });

  const out: Types.V1.CastAddBody = {
    embedsDeprecated: (b.embeds_deprecated as string[]) ?? (b.embedsDeprecated as string[]) ?? [],
    mentions: ((b.mentions as string[]) ?? []).map(Number),
    text: String(b.text ?? ""),
    embeds,
    mentionsPositions: ((b.mentions_positions as string[]) ?? (b.mentionsPositions as string[]) ?? []).map(Number),
    type: String(b.type ?? "CAST"),
  };

  const parent = (b.parent_cast_id ?? b.parentCastId) as Record<string, unknown> | undefined;
  if (parent) {
    const ph = parent.hash;
    const hashHex = typeof ph === "string" && ph.includes("=") ? b64ToHex0x(ph) : bytesToHex(toU8(ph)) as Hex;
    out.parentCastId = { fid: Number(parent.fid), hash: hashHex };
  }
  if (b.parent_url !== undefined && b.parent_url !== "") {
    out.parentUrl = String(b.parent_url);
  } else if (b.parentUrl !== undefined && b.parentUrl !== "") {
    out.parentUrl = String(b.parentUrl);
  }
  return out;
}

function mapCastRemove(b: Record<string, unknown>): Types.V1.CastRemoveBody {
  // `protobufjs` `toObject` yields base64 for bytes when `bytes: String`.
  return { targetHash: String(b.target_hash ?? "") };
}

function mapReaction(b: Record<string, unknown>): Types.V1.ReactionBody {
  const out: Types.V1.ReactionBody = {
    type: String(b.type ?? ""),
  };
  const tc = (b.target_cast_id ?? b.targetCastId) as Record<string, unknown> | undefined;
  if (tc) {
    const th = tc.hash;
    const hashHex = typeof th === "string" && th.includes("=") ? b64ToHex0x(th) : bytesToHex(toU8(th)) as Hex;
    out.targetCastId = { fid: Number(tc.fid), hash: hashHex };
  }
  const tu = b.target_url ?? b.targetUrl;
  if (tu !== undefined && tu !== "") {
    out.targetUrl = String(tu);
  }
  return out;
}

function mapLink(b: Record<string, unknown>): Types.V1.LinkBody {
  const dt = b.displayTimestamp ?? b.display_timestamp;
  return {
    type: String(b.type ?? ""),
    displayTimestamp: dt !== undefined ? Number(dt) : undefined,
    targetFid: Number(b.target_fid ?? b.targetFid ?? 0),
  };
}

function mapUserData(b: Record<string, unknown>): Types.V1.UserDataBody {
  return {
    type: String(b.type ?? ""),
    value: String(b.value ?? ""),
  };
}

function toU8(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (typeof v === "string") return hexToBytes(v as Hex);
  return new Uint8Array();
}

/**
 * Convert hub JSON (`validateMessage` / `submitMessage` wire shape) back to protobuf bytes for POSTing.
 * Use this on a relay server that receives JSON from clients and forwards to a node.
 */
export async function hubJsonToProtobufBytes(msg: Types.V1.Message): Promise<Uint8Array> {
  const root = await getProtoRoot();
  const Message = root.lookupType("Message");
  const MessageData = root.lookupType("MessageData");

  const dataJson = hubMessageDataToProtoJson(msg.data);
  const err = MessageData.verify(dataJson);
  if (typeof err === "string") throw new Error(`Invalid MessageData JSON: ${err}`);

  const dataObj = MessageData.create(dataJson);
  const top = {
    data: dataObj,
    hash: hexToBytes(msg.hash as Hex),
    hashScheme: hubHashSchemeToNum(msg.hashScheme),
    signature: b64Decode(msg.signature),
    signatureScheme: hubSigSchemeToNum(msg.signatureScheme),
    signer: hexToBytes(msg.signer as Hex),
  };
  const terr = Message.verify(top);
  if (typeof terr === "string") throw new Error(`Invalid Message: ${terr}`);
  return new Uint8Array(Message.encode(Message.create(top)).finish());
}

function hubHashSchemeToNum(s: string): number {
  if (s === "HASH_SCHEME_BLAKE3") return 1;
  return 0;
}

function hubSigSchemeToNum(s: string): number {
  if (s === "SIGNATURE_SCHEME_ED25519") return 1;
  return 0;
}

function hubMessageDataToProtoJson(data: Types.V1.MessageData): Record<string, unknown> {
  const type = hubMessageTypeToNum(data.type);
  const network = hubNetworkToNum(data.network);
  const base: Record<string, unknown> = {
    type,
    fid: data.fid,
    timestamp: data.timestamp,
    network,
  };

  if (data.castAddBody) {
    base.cast_add_body = hubCastAddToProto(data.castAddBody);
  } else if (data.castRemoveBody) {
    base.cast_remove_body = {
      target_hash: b64Decode(data.castRemoveBody.targetHash),
    };
  } else if (data.reactionBody) {
    base.reaction_body = hubReactionToProto(data.reactionBody);
  } else if (data.linkBody) {
    base.link_body = hubLinkToProto(data.linkBody);
  } else if (data.userDataBody) {
    base.user_data_body = {
      type: hubUserDataTypeToNum(data.userDataBody.type),
      value: data.userDataBody.value,
    };
  }

  return base;
}

function hubMessageTypeToNum(s: string): number {
  const m: Record<string, number> = {
    MESSAGE_TYPE_CAST_ADD: 1,
    MESSAGE_TYPE_CAST_REMOVE: 2,
    MESSAGE_TYPE_REACTION_ADD: 3,
    MESSAGE_TYPE_REACTION_REMOVE: 4,
    MESSAGE_TYPE_LINK_ADD: 5,
    MESSAGE_TYPE_LINK_REMOVE: 6,
    MESSAGE_TYPE_USER_DATA_ADD: 11,
  };
  return m[s] ?? 0;
}

function hubNetworkToNum(s: string): number {
  const m: Record<string, number> = {
    FARCASTER_NETWORK_MAINNET: 1,
    FARCASTER_NETWORK_TESTNET: 2,
    FARCASTER_NETWORK_DEVNET: 3,
  };
  return m[s] ?? 0;
}

function hubUserDataTypeToNum(s: string): number {
  const m: Record<string, number> = {
    USER_DATA_TYPE_PFP: 1,
    USER_DATA_TYPE_DISPLAY: 2,
    USER_DATA_TYPE_BIO: 3,
    USER_DATA_TYPE_URL: 5,
    USER_DATA_TYPE_USERNAME: 6,
    USER_DATA_TYPE_LOCATION: 7,
    USER_DATA_TYPE_TWITTER: 8,
    USER_DATA_TYPE_GITHUB: 9,
    USER_DATA_TYPE_BANNER: 10,
    USER_DATA_PRIMARY_ADDRESS_ETHEREUM: 11,
    USER_DATA_PRIMARY_ADDRESS_SOLANA: 12,
    USER_DATA_TYPE_PROFILE_TOKEN: 13,
  };
  return m[s] ?? 0;
}

function hubCastAddToProto(b: Types.V1.CastAddBody): Record<string, unknown> {
  const embeds = b.embeds.map((e) => {
    if ("url" in e) return { url: e.url };
    return {
      cast_id: {
        fid: e.castId.fid,
        hash: hexToBytes(e.castId.hash as Hex),
      },
    };
  });
  const out: Record<string, unknown> = {
    embeds_deprecated: b.embedsDeprecated,
    mentions: b.mentions,
    mentions_positions: b.mentionsPositions,
    embeds,
    text: b.text,
    type: castTypeStrToNum(b.type),
  };
  if (b.parentCastId) {
    out.parent_cast_id = {
      fid: b.parentCastId.fid,
      hash: hexToBytes(b.parentCastId.hash as Hex),
    };
  }
  if (b.parentUrl !== undefined) {
    out.parent_url = b.parentUrl;
  }
  return out;
}

function castTypeStrToNum(s: string): number {
  const m: Record<string, number> = { CAST: 0, LONG_CAST: 1, TEN_K_CAST: 2 };
  return m[s] ?? 0;
}

function hubReactionToProto(b: Types.V1.ReactionBody): Record<string, unknown> {
  const out: Record<string, unknown> = {
    type: reactionTypeStrToNum(b.type),
  };
  if (b.targetCastId) {
    out.target_cast_id = {
      fid: b.targetCastId.fid,
      hash: hexToBytes(b.targetCastId.hash as Hex),
    };
  }
  if (b.targetUrl !== undefined) {
    out.target_url = b.targetUrl;
  }
  return out;
}

function reactionTypeStrToNum(s: string): number {
  if (s === "REACTION_TYPE_LIKE" || s === "LIKE") return 1;
  if (s === "REACTION_TYPE_RECAST" || s === "RECAST") return 2;
  return 0;
}

function hubLinkToProto(b: Types.V1.LinkBody): Record<string, unknown> {
  const out: Record<string, unknown> = {
    type: b.type,
    target_fid: b.targetFid,
  };
  if (b.displayTimestamp !== undefined) {
    out.displayTimestamp = b.displayTimestamp;
  }
  return out;
}
