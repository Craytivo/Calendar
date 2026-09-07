# Calendar

A personal sports calendar built around **signal over noise**.

## Data architecture

Calendar now uses a seven-calendar-day My Games window and a provider-independent normalization layer:

```text
TheSportsDB free API
        ↓
Server-side Vercel API route
        ↓
TheSportsDB adapter
        ↓
Normalized Game / Team context
        ↓
Priority engine
        ↓
My Games selector
        ↓
Calendar UI
```

The browser never calls TheSportsDB directly. The `/api/sports` serverless route fetches the free API, caches responses at the edge for 15 minutes, normalizes provider data, and returns only the current seven-day window.

## Free data sources

The primary source is TheSportsDB's free v1 API. The current implementation pulls the next and previous league events for NFL, NBA, NCAA Football, Champions League, La Liga, Premier League, MLB, NHL, and UFC. Soccer standings are also requested where the free endpoint provides them.

TheSportsDB currently documents a 30-request-per-minute free limit. Calendar stays below that limit by batching the league schedule calls and caching the server response.

The provider is deliberately replaceable. Public-source/scraper adapters can be added for fields TheSportsDB does not reliably provide, especially standings/rankings for American sports and NCAA data. Those sources should be fetched server-side and converted into the same normalized model before reaching the priority engine.

## Important data-quality rule

The priority engine remains ours. A provider's own notion of importance is never allowed to override the user's rules for favorite teams, Champions League, major games, UFC main cards, or the daily three-game non-favorite cap.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

The production deployment expects Vercel-style `/api` serverless routing.
