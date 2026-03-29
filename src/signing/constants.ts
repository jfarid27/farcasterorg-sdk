/** Milliseconds since Unix epoch for 2021-01-01T00:00:00.000Z (Farcaster epoch base). */
export const FARCASTER_EPOCH_MS = 1_609_459_200_000n;

/** Farcaster `MessageData.timestamp`: seconds since the Farcaster epoch (same base as {@link FARCASTER_EPOCH_MS}). */
export function unixMsToFarcasterTimestamp(ms: bigint): number {
  const s = (ms - FARCASTER_EPOCH_MS) / 1000n;
  if (s < 0n || s > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("timestamp out of range");
  }
  return Number(s);
}

export function unixSecondsToFarcasterTimestamp(seconds: number): number {
  const ms = BigInt(seconds) * 1000n;
  return unixMsToFarcasterTimestamp(ms);
}

/** Current Farcaster timestamp from system clock. */
export function getCurrentFarcasterTimestamp(): number {
  return unixMsToFarcasterTimestamp(BigInt(Date.now()));
}
