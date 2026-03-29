/** Milliseconds since Unix epoch for `2021-01-01T00:00:00.000Z` (Farcaster epoch base; aligns with hypersnap `FARCASTER_EPOCH`). */
export const FARCASTER_EPOCH_MS = 1_609_459_200_000n;

/**
 * Converts a Unix timestamp in milliseconds to Farcaster `MessageData.timestamp` (seconds since `FARCASTER_EPOCH_MS`).
 *
 * @param ms - Wall-clock milliseconds since Unix epoch (e.g. `Date.now()` as bigint).
 * @returns Unsigned seconds offset used in protobuf `MessageData.timestamp`.
 * @throws If the result is negative or not safely representable as a JS number.
 */
export function unixMsToFarcasterTimestamp(ms: bigint): number {
  const s = (ms - FARCASTER_EPOCH_MS) / 1000n;
  if (s < 0n || s > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("timestamp out of range");
  }
  return Number(s);
}

/**
 * Same as `unixMsToFarcasterTimestamp` but takes whole Unix **seconds** (not milliseconds).
 *
 * @param seconds - Unix time in seconds since 1970-01-01.
 */
export function unixSecondsToFarcasterTimestamp(seconds: number): number {
  const ms = BigInt(seconds) * 1000n;
  return unixMsToFarcasterTimestamp(ms);
}

/**
 * Current Farcaster timestamp using the device clock (`Date.now()`).
 *
 * @returns Seconds since the Farcaster epoch for use in `MessageData.timestamp`.
 */
export function getCurrentFarcasterTimestamp(): number {
  return unixMsToFarcasterTimestamp(BigInt(Date.now()));
}
