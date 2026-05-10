# Refi Radar iOS

Refi Radar ships as a Capacitor iOS app that wraps the existing Vite/React frontend and uses native APNs push notifications.

## Local workflow

```bash
pnpm install
pnpm ios:sync
pnpm ios:open
```

In Xcode:

1. Select the `App` target.
2. Set the signing team.
3. Keep bundle ID `com.jonhenshaw.refiradar` or update it in both Xcode and `capacitor.config.ts`.
4. Ensure **Signing & Capabilities → Push Notifications** is enabled.
5. Run on a physical iPhone. APNs registration does not work on a plain simulator flow.

## Worker / APNs secrets

Create an Apple Developer APNs Auth Key (`.p8`) and set Worker secrets:

```bash
cd apps/worker
pnpm exec wrangler secret put APNS_KEY_ID
pnpm exec wrangler secret put APNS_TEAM_ID
pnpm exec wrangler secret put APNS_BUNDLE_ID      # com.jonhenshaw.refiradar
pnpm exec wrangler secret put APNS_PRIVATE_KEY    # paste .p8 contents; escaped \n also works
pnpm exec wrangler secret put APNS_USE_SANDBOX    # true for dev builds, false for TestFlight/App Store
pnpm exec wrangler secret put NOTIFICATION_ADMIN_TOKEN
```

Apply the D1 schema update before testing registration:

```bash
cd apps/worker
pnpm exec wrangler d1 execute refi-radar-prod --remote --file src/db/schema.sql
```

The app registers device tokens at `/api/notifications/register`, syncs local rate alert rules to `/api/notifications/rules`, and the scheduled collector dispatches APNs notifications when server-synced rate rules trigger.

Manual dispatch test:

```bash
curl -X POST https://refi-radar-worker.equine-abyss5k.workers.dev/api/notifications/dispatch \
  -H "Authorization: Bearer $NOTIFICATION_ADMIN_TOKEN"
```
