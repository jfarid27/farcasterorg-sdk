# HyperSnap TypeScript SDK

TypeScript SDK for HyperSnap Farcaster Hub and API compatibility.

## Installation

### Node.js
```bash
npm install jsr:@jfarid27/farcaster-sdk@<version-number>
```

### Deno
```typescript
import { HyperSnapClient } from "jsr:@jfarid27/farcaster-sdk";
```

## Usage

```typescript
import { HyperSnapClient } from "jsr:@jfarid27/farcaster-sdk";

const client = new HyperSnapClient("http://localhost:8080");

// Access V1 (Hub) APIs
const hubInfo = await client.v1.getInfo();
const cast = await client.v1.casts.getById(1, "0x...");

// Access V2 (API Compatibility) APIs
const trending = await client.v2.feeds.getTrendingFeed("24h");
```

## API Organization

The SDK is organized by API version and then by entity:

- `client.v1`: Hubble-compatible Hub APIs
  - `casts`: Get casts by ID, FID, etc.
  - `reactions`: Get reactions
  - `links`: Get links
  - `users`: User data, storage limits, FID lookups
  - `events`: Hub events
  - `network`: Hub info and peers
- `client.v2`: Farcaster API Compatibility
  - `social`: Followers and following
  - `channels`: Channel info and members
  - `search`: Cast search
  - `conversations`: Thread lookups
  - `feeds`: Trending and following feeds
