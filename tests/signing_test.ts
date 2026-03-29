import { assert, assertEquals } from "jsr:@std/assert@1.0.10";
import { blake3 } from "@noble/hashes/blake3";
import { hexToBytes } from "viem";
import { blake3_20 } from "../src/signing/blake3_20.ts";
import { buildCastAddMessageData, buildLinkMessageData, signCastAdd } from "../src/signing/builders.ts";
import { encodeSignedMessage, hashMessageData } from "../src/signing/encode.ts";
import {
  getSignerPublicKey,
  hexToEd25519SecretKey,
  signMessageHashDigest,
  verifyMessageHashDigest,
} from "../src/signing/ed25519_signer.ts";
import { hubJsonToProtobufBytes, protobufMessageBytesToHubJson } from "../src/signing/hub_json.ts";
import { getProtoRoot } from "../src/signing/proto_root.ts";

const TEST_SK = hexToEd25519SecretKey(
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
);

Deno.test("blake3_20 matches manual first 20 bytes of blake3", () => {
  const data = new TextEncoder().encode("abc");
  const full = blake3(data);
  assertEquals([...blake3_20(data)], [...full.slice(0, 20)]);
});

Deno.test("Ed25519 signature verifies on 20-byte digest (hub rules)", async () => {
  const md = buildCastAddMessageData({
    fid: 1,
    network: 2,
    timestamp: 100,
    text: "x",
  });
  const { hash } = await hashMessageData(md);
  const sig = signMessageHashDigest(hash, TEST_SK);
  const pub = getSignerPublicKey(TEST_SK);
  assert(verifyMessageHashDigest(hash, sig, pub));
});

Deno.test("encodeSignedMessage produces verifiable hash + signature", async () => {
  const md = buildCastAddMessageData({
    fid: 999,
    network: 2,
    timestamp: 200,
    text: "hello",
  });
  const bytes = await encodeSignedMessage(md, TEST_SK);
  const { hash: expectedHash } = await hashMessageData(md);
  const root = await getProtoRoot();
  const Message = root.lookupType("Message");
  const decoded = Message.decode(bytes) as unknown as {
    hash: Uint8Array;
    signature: Uint8Array;
    signer: Uint8Array;
  };
  assertEquals([...decoded.hash], [...expectedHash]);
  assert(verifyMessageHashDigest(decoded.hash, decoded.signature, decoded.signer));
  assertEquals([...decoded.signer], [...getSignerPublicKey(TEST_SK)]);
});

Deno.test("hub JSON round-trips to identical protobuf bytes", async () => {
  const md = buildCastAddMessageData({
    fid: 12345,
    network: 2,
    timestamp: 944678400,
    text: "Hello",
  });
  const a = await encodeSignedMessage(md, TEST_SK);
  const j = await protobufMessageBytesToHubJson(a);
  const b = await hubJsonToProtobufBytes(j);
  assertEquals([...a], [...b]);
});

Deno.test("signCastAdd helper returns protobuf bytes", async () => {
  const bytes = await signCastAdd(
    {
      fid: 3,
      network: 2,
      timestamp: 50,
      text: "ok",
    },
    TEST_SK,
  );
  assert(bytes.length > 0);
});

Deno.test("cast hash hex parses to 20 bytes for targets", () => {
  const h = "0x" + "ab".repeat(20);
  const b = hexToBytes(h as `0x${string}`);
  assertEquals(b.length, 20);
});

Deno.test("link follow message encodes and signs", async () => {
  const md = buildLinkMessageData({
    fid: 10,
    network: 2,
    timestamp: 300,
    linkType: "follow",
    targetFid: 20,
    messageType: 5,
  });
  const bytes = await encodeSignedMessage(md, TEST_SK);
  assert(bytes.length > 0);
});
