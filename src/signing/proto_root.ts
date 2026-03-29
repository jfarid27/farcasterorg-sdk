import protobuf from "protobufjs";

let cached: protobuf.Root | null = null;

export async function getProtoRoot(): Promise<protobuf.Root> {
  if (cached) return cached;
  const protoText = await Deno.readTextFile(
    new URL("../../proto/farcaster_message.proto", import.meta.url),
  );
  const parsed = protobuf.parse(protoText, new protobuf.Root(), { keepCase: true });
  cached = parsed.root;
  return cached;
}
