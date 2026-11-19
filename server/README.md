# Riftbound Discord authentication backend

This service performs Discord OAuth2 login and verifies that a player has the
configured **Beta Tester** role in the configured Discord server.

## Requirements

- Node.js 20 or newer
- A Discord application
- A deployed HTTPS backend for real beta testing

## Local setup

1. Open a terminal in this folder.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Fill in the Discord Client ID and Client Secret from the Discord Developer Portal.
5. Generate a separate random `SESSION_SECRET` with at least 32 characters.
6. Set `FRONTEND_ORIGIN` to the exact local origin used by your frontend.
7. Add the exact value of `DISCORD_REDIRECT_URI` to the Discord application's OAuth2 Redirects list.
8. Run `npm run dev`.

The Discord OAuth scopes requested are `identify` and `guilds.members.read`.
The latter allows the backend to check the signed-in user's own member record and
its role IDs without needing a Discord bot token.

## Hosting

For a Render Web Service, use:

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Runtime: Node

Set all variables from `.env.example` in the hosting provider's environment
settings. Set `NODE_ENV=production`, use the deployed HTTPS frontend origin,
and set `DISCORD_REDIRECT_URI` to the backend's HTTPS callback URL. Add that
same callback URL in the Discord Developer Portal.

Never commit `.env`, expose the Client Secret in browser code, or paste secrets
into chat. The backend encrypts the short-lived Discord access token inside an
HttpOnly cookie and re-checks the Beta Tester role whenever the frontend checks
the session.

## API

- `GET /health` — service health check
- `GET /auth/discord` — begin Discord OAuth2 login
- `GET /auth/discord/callback` — Discord OAuth2 callback
- `GET /api/session` — check login and current Beta Tester role
- `POST /auth/logout` — clear the login cookie

The frontend must call the API with credentials enabled when checking the
session and logging out.
