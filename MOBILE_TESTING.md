# Riftbound mobile compatibility and testing

## Current implementation

The mobile layout pass adds:
- Safe-area and dynamic viewport support for modern phones.
- Smaller main-menu, preparation, settings, campsite and reward layouts.
- Larger touch targets for buttons and tower upgrades.
- A single-column battlefield layout on narrow screens while preserving the 16:9 game world.
- Touch-first instructions and pointer capture when tapping the battlefield.
- Cloud saves preserve permanent progression (class XP, skill trees, trait rolls, pity, owned traits and equipped trait) plus settings.
- Active expedition state is deliberately not saved. Refreshing or reopening the game does not resume an unfinished run.

## Important: Safari Discord authentication

The current frontend is hosted at `silverinity.github.io` and the authentication API at `riftbound-auth.onrender.com`. These are different sites. The backend already sets its session cookie with `SameSite=None; Secure`, but Safari privacy protections can still restrict cross-site cookies.

There is no safe frontend-only code change that can force Safari to accept a third-party session cookie. Do not move Discord client secrets into the browser or store Discord access tokens in localStorage.

### Recommended permanent solution

Use two hostnames under one domain you own, for example:
- Game: `https://play.YOUR-DOMAIN/` (GitHub Pages custom domain)
- Auth API: `https://auth.YOUR-DOMAIN/` (Render custom domain)

Because both hosts share the same registrable domain, browser cookie rules treat them as same-site. Configure the custom domains in GitHub Pages and Render using the DNS records each provider displays. Then update:
- GitHub Pages custom domain to the play hostname.
- Render custom domain to the auth hostname.
- Render `FRONTEND_ORIGIN` to the exact game origin, with no trailing slash.
- Render `DISCORD_REDIRECT_URI` to `https://auth.YOUR-DOMAIN/auth/discord/callback`.
- Discord Developer Portal OAuth redirect URI to that exact same callback.
- `window.RIFTBOUND_API_BASE` in `index.html` to `https://auth.YOUR-DOMAIN`.

Never put `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, or database credentials in frontend files.

## Device test checklist

Run these checks after the game is deployed to the test domain:

### iPhone Safari
1. Open the game in Safari (not an embedded Discord browser).
2. Sign in with an approved Discord account.
3. Confirm the game returns to the preparation menu and shows the signed-in user.
4. Refresh the page and confirm the session remains.
5. Open the Trait Hall and confirm the current trait, rolls and pity values load.
6. Redeem a test code only on a designated test account; confirm the added rolls remain after refreshing and signing in again.
7. Start a run, place and upgrade a tower, then refresh. Confirm the unfinished run is not resumed, while permanent progression remains intact.
8. Repeat with an account without the Beta Tester role and confirm access is denied.

### Android Chrome
Repeat the same eight checks in Chrome.

### Touch and layout
- Portrait: main menu, settings, preparation, campsite, reward cards and tower panel fit without horizontal scrolling.
- Landscape: battlefield remains visible and the tower buttons remain usable.
- Tap a tower option, then tap an open battlefield location to place it.
- Tap an existing tower and use each upgrade button.
- Confirm the page does not scroll when dragging/tapping inside the battlefield.

## Current limitation

Real-device validation is still required. A successful `/health` response confirms the Render service is reachable, but does not confirm that Safari accepts the login cookie or that credentialed API requests succeed.
