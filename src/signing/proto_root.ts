import protobuf from "protobufjs";

let cached: protobuf.Root | null = null;

/**
 * Loads and caches the protobuf schema from `proto/farcaster_message.proto` (used to encode/decode hub `Message` types).
 *
 * Must be run in an environment where `Deno.readTextFile` works with `import.meta.url` (Deno; bundlers may need to inline assets).
 *
 * @returns A protobufjs `Root` containing `Message`, `MessageData`, and related types.
 */
export async function getProtoRoot(): Promise<protobuf.Root> {
  if (cached) return cached;
  const protoText = await Deno.readTextFile(
    new URL("../../proto/farcaster_message.proto", import.meta.url),
  );
  const parsed = protobuf.parse(protoText, new protobuf.Root(), { keepCase: true });
  cached = parsed.root;
  return cached;
}
