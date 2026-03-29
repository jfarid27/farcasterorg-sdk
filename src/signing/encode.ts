import type protobuf from "protobufjs";
import { blake3_20 } from "./blake3_20.ts";
import type { Ed25519SecretKey } from "./ed25519_signer.ts";
import { getSignerPublicKey, signMessageHashDigest } from "./ed25519_signer.ts";
import { getProtoRoot } from "./proto_root.ts";

/**
 * Loose object accepted by protobufjs for a `MessageData` message (field names match `farcaster_message.proto`, e.g. `cast_add_body`).
 */
export type MessageDataJson = Record<string, unknown>;

/**
 * Encodes `MessageData`, computes Blake3 (20 bytes), signs with Ed25519, and returns a full `Message` protobuf byte array.
 *
 * Use this on a **client** (e.g. mobile app) to produce the body for `POST /v1/submitMessage` (`application/octet-stream`).
 *
 * @param messageData - Valid protobuf-json shape for `MessageData` (see `buildCastAddMessageData` and related builders).
 * @param secretKey - Farcaster app signer (Ed25519 seed), not an Ethereum key.
 * @returns Serialized `Message` ready to POST as raw bytes.
 */
export async function encodeSignedMessage(
  messageData: MessageDataJson,
  secretKey: Ed25519SecretKey,
): Promise<Uint8Array> {
  const root = await getProtoRoot();
  const MessageData = root.lookupType("MessageData");
  const Message = root.lookupType("Message");

  const dataErr = MessageData.verify(messageData);
  if (typeof dataErr === "string") {
    throw new Error(`Invalid MessageData: ${dataErr}`);
  }
  const dataObj = MessageData.create(messageData);
  const dataBytes = MessageData.encode(dataObj).finish();
  const hash = blake3_20(new Uint8Array(dataBytes));
  const signature = signMessageHashDigest(hash, secretKey);
  const signer = getSignerPublicKey(secretKey);

  const topErr = Message.verify({
    data: dataObj,
    hash,
    hashScheme: 1,
    signature,
    signatureScheme: 1,
    signer,
  });
  if (typeof topErr === "string") {
    throw new Error(`Invalid Message: ${topErr}`);
  }
  const msgObj = Message.create({
    data: dataObj,
    hash,
    hashScheme: 1,
    signature,
    signatureScheme: 1,
    signer,
  });
  return new Uint8Array(Message.encode(msgObj).finish());
}

/**
 * Serializes `MessageData` and returns both the canonical bytes and the 20-byte Blake3 digest used as the signed payload.
 *
 * Useful for tests or custom signing flows; normal use is `encodeSignedMessage`.
 *
 * @param messageData - Same shape as for {@link encodeSignedMessage}.
 * @returns `dataBytes` — protobuf payload; `hash` — `blake3_20(dataBytes)`.
 */
export async function hashMessageData(messageData: MessageDataJson): Promise<{
  dataBytes: Uint8Array;
  hash: Uint8Array;
}> {
  const root = await getProtoRoot();
  const MessageData = root.lookupType("MessageData");
  const err = MessageData.verify(messageData);
  if (typeof err === "string") {
    throw new Error(`Invalid MessageData: ${err}`);
  }
  const obj = MessageData.create(messageData);
  const dataBytes = new Uint8Array(MessageData.encode(obj).finish());
  return { dataBytes, hash: blake3_20(dataBytes) };
}

/**
 * Decodes protobuf `Message` bytes into a protobufjs runtime message (inspect fields or re-encode).
 *
 * @param bytes - Output of {@link encodeSignedMessage} or bytes from the network.
 */
export async function decodeMessageProtobuf(bytes: Uint8Array): Promise<protobuf.Message> {
  const root = await getProtoRoot();
  const Message = root.lookupType("Message");
  return Message.decode(bytes);
}
