import type protobuf from "protobufjs";
import { blake3_20 } from "./blake3_20.ts";
import type { Ed25519SecretKey } from "./ed25519_signer.ts";
import { getSignerPublicKey, signMessageHashDigest } from "./ed25519_signer.ts";
import { getProtoRoot } from "./proto_root.ts";

export type MessageDataJson = Record<string, unknown>;

/** Encodes `MessageData`, hashes with Blake3 (20 bytes), signs with Ed25519, returns full `Message` protobuf bytes. */
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

/** Returns serialized `MessageData` and the 20-byte digest used for signing. */
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

export async function decodeMessageProtobuf(bytes: Uint8Array): Promise<protobuf.Message> {
  const root = await getProtoRoot();
  const Message = root.lookupType("Message");
  return Message.decode(bytes);
}
