# Refi Radar iOS

Refi Radar ships as a Capacitor iOS app that wraps the existing Vite/React frontend and uses native APNs push notifications.

The web frontend is the canonical UI. In a Capacitor WebView, API calls default to
`https://refi-radar-worker.equine-abyss5k.workers.dev` instead of relative `/api`
paths so the native app can reach the Worker from `capacitor://localhost`.

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

## Ad Hoc package

Ad Hoc distribution requires an Apple Distribution certificate and an Ad Hoc provisioning profile for `com.jonhenshaw.refiradar` that includes the target iPhone UDID. Xcode 17 names this export method `release-testing`; older tooling may call the same path `ad-hoc`.

```bash
pnpm ios:sync
xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/refi-radar-adhoc/App.xcarchive \
  -allowProvisioningUpdates \
  archive
xcodebuild -exportArchive \
  -archivePath /tmp/refi-radar-adhoc/App.xcarchive \
  -exportPath /tmp/refi-radar-adhoc/export \
  -exportOptionsPlist ios/App/ExportOptions-AdHoc.plist \
  -allowProvisioningUpdates
```

Release/Ad Hoc builds use the production APNs entitlement, so set `APNS_USE_SANDBOX=false` for Worker notifications when testing an Ad Hoc IPA.

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

The app registers device tokens at `/api/notifications/register`, remembers when native push has been enabled, syncs local rate alert rules to `/api/notifications/rules`, and restores APNs registration/listeners on later launches when iOS permission is still granted.
The scheduled collector dispatches APNs notifications when server-synced rate rules trigger.
Foreground and tapped APNs alerts are bridged back into the React app so they appear in the same toast and recent-alert feed as locally evaluated web alerts. Capacitor is configured to present foreground pushes with badge, sound, and alert.

Manual dispatch test:

```bash
curl -X POST https://refi-radar-worker.equine-abyss5k.workers.dev/api/notifications/dispatch \
  -H "Authorization: Bearer $NOTIFICATION_ADMIN_TOKEN"
```
