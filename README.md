# lexus-cpo-notify

[![Deploy](https://github.com/libraz/lexus-cpo-notify/actions/workflows/deploy.yml/badge.svg)](https://github.com/libraz/lexus-cpo-notify/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Cloudflare Worker that monitors the [Lexus CPO Japan (Certified Pre-Owned)](https://cpo.lexus.jp/) inventory and sends Discord notifications when matching vehicles are found. Targets the Japanese domestic market only.

## Features

- Scrapes Lexus CPO listing and detail pages
- Multi-profile support — monitor different models/criteria simultaneously
- Discord webhook notifications with vehicle images
- Cloudflare KV for tracking seen vehicles and preventing duplicate notifications (90-day TTL)
- Runs on a cron schedule (default: twice daily at JST 10:00 / 22:00)

## Search Profiles

Edit `src/config.ts` to add or modify search profiles:

```ts
{
  id: 'lc500h-white',
  label: 'LC500h White / Red or Black interior',
  category: 'LC',           // Lexus CPO category code
  minModelYear: 2025,
  maxPrice: Infinity,
  hybridOnly: true,
  bodyColorCodes: ['083'],   // 083 = white
  interiorColors: ['レッド', 'ブラック', '赤', '黒'],
}
```

Available category codes: `LC`, `RX`, `NX`, `LX`, `IS`, `ES`, `LS`, `RC`, `UX`, etc.

## Prerequisites

- [mise](https://mise.jdx.dev/) (pins Node 26 + Yarn 4 via `mise.toml`)
- [Cloudflare account](https://dash.cloudflare.com/) (free plan is sufficient)
- Discord server with a webhook URL

## Initial Setup

### 1. Install dependencies

```bash
yarn install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 3. Create KV namespace

```bash
npx wrangler kv namespace create LEXUS_KV
```

Copy the output `id` and paste it into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "LEXUS_KV"
id = "paste-your-id-here"
```

### 4. Set Discord webhook secret

```bash
npx wrangler secret put DISCORD_WEBHOOK_URL
```

Paste your Discord webhook URL when prompted.

To create a webhook: Discord Server Settings → Integrations → Webhooks → New Webhook.

### 5. Deploy

```bash
yarn deploy
```

### 6. Verify

Trigger a manual run:

```bash
curl https://lexus-cpo-notify.<your-subdomain>.workers.dev/run
```

Or from the Cloudflare dashboard: Workers & Pages → lexus-cpo-notify → Triggers → Cron → Trigger Now.

## GitHub Actions (CI/CD)

Pushes to `main` automatically run typecheck → test → lint → deploy.

### Required GitHub secret

1. Cloudflare Dashboard → My Profile → API Tokens → Create Token
2. Use the **"Edit Cloudflare Workers"** template
3. Copy the token
4. GitHub repo → Settings → Secrets and variables → Actions → New repository secret
5. Name: `CLOUDFLARE_API_TOKEN`, Value: the token

The `DISCORD_WEBHOOK_URL` is stored in Cloudflare Secrets (not GitHub) — it persists across deploys.

## Development

```bash
# Start local dev server
yarn dev

# Type check
yarn typecheck

# Run tests
yarn test

# Lint & format check
yarn check

# Auto-fix lint & format
yarn check:fix
```

## Cron Schedule

Configured in `wrangler.toml`:

```toml
[triggers]
crons = ["0 1,13 * * *"]  # UTC 1:00 and 13:00 = JST 10:00 and 22:00
```

## KV Key Structure

| Key pattern           | Purpose                           | TTL     |
| --------------------- | --------------------------------- | ------- |
| `car:{category}:{id}` | Vehicle listing + detail data     | 90 days |
| `notified:{id}`       | Duplicate notification prevention | 90 days |
| `error:{hash}`        | Error notification suppression    | 30 days |

## Cost

Runs comfortably within the **Cloudflare Workers Free plan**:

- 2 cron executions/day (of 100k/day limit)
- ~30 KV reads/execution (of 100k/day limit)
- ~15 KV writes/execution (of 1k/day limit)
- Cron Triggers use 1 of 5 available slots

## Tech Stack

- TypeScript (strict)
- Cloudflare Workers + KV + Cron Triggers
- Cheerio (HTML parsing)
- Discord Webhook API
- Biome (linter/formatter)
- Vitest (testing)
- mise (Node 26 + Yarn 4)
