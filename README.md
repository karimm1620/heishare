# heishare

A cross-platform local-network file and text sharing app — nearby devices
discover each other and transfer directly, with no account, no cloud, and
no internet requirement. Architecturally inspired by [LocalSend](https://github.com/localsend/localsend)
(UDP multicast discovery, REST-style HTTPS API, port `53317`) but **not**
a claim of LocalSend protocol interoperability — heishare uses its own
versioned protocol under `/api/heishare/v1/...`. See `docs/prd/` for the
full original specification this was built from.

## Status at a glance

| Layer | Status |
|---|---|
| UI (Expo Router screens, NativeWind, RNR-style primitives) | Written, typechecks, not yet run on a simulator/device |
| Application services (discovery, transfers, settings, history) | Written, core logic unit-tested |
| Protocol (versioned types + validation) | Written, unit-tested (`npm test`) |
| Native module — Android (Kotlin) | Written, **unverified** — no Gradle toolchain in the environment this was built in |
| Native module — iOS (Swift) | Structural skeleton only, most bodies are `TODO` |

**Nothing here has run on a real device or emulator yet.** `npm install`,
`npx tsc --noEmit`, and `npm test` were all run for real and pass — that
covers every pure TypeScript layer. The native layer (`modules/local-network`)
is a strong first draft written to the Expo Modules API and Android/iOS
platform APIs from documentation and established conventions, not from a
compile-and-run loop. Budget real time for `eas build` (or Android
Studio/Xcode directly) + on-device iteration before treating it as working.

## Tech stack

Expo SDK 57 · Expo Router · React Native 0.86 · TypeScript · NativeWind 4 ·
`@expo/ui` (Jetpack Compose, used for the Settings switch) · a custom Expo
Module (`modules/local-network`) for TCP/UDP/TLS/streaming.

Dependency versions in `package.json` are pinned to what actually resolved
cleanly against the npm registry mirror available while building this
(`expo@57.0.12` — `57.0.13`'s own `expo-file-system` requirement pointed at
a version not yet published there). Run `npx expo install --check` from an
environment with full registry access to confirm nothing has moved since.

## Getting started

```bash
npm install
```

Because this app has a custom native module, **it cannot run in Expo Go**.
You need a development build:

```bash
npx expo run:android      # or: eas build --profile development --platform android
```

iOS needs the native module's Swift side filled in first (see below) before
`expo run:ios` will do anything meaningful beyond compiling stubs.

### Working on the UI without the native module

Set `EXPO_PUBLIC_USE_MOCK_NETWORK=1` and run in Expo Go or a plain dev
client. This swaps in `src/lib/networking/__dev__/mockLocalNetworkService.ts`
— an in-memory simulation of discovery/transfer events — instead of the real
native module. It's gated behind `__DEV__` and this explicit env var so
it's structurally impossible for it to end up in a release build; see the
comment at the top of that file and in `localNetworkService.ts`.

```bash
EXPO_PUBLIC_USE_MOCK_NETWORK=1 npx expo start
```

### Scripts

```bash
npm run typecheck   # tsc --noEmit — clean as of this writing
npm test            # jest — 49 tests, all passing (protocol/security/state-machine logic)
npm run lint        # eslint — clean except one documented, scoped warning (see eslint.config.js)
```

## Project structure

Follows `docs/prd/05-project-structure-and-dependencies.md`, adapted to the
Expo SDK 57 template's actual `src/` layout:

```
src/
├── app/            Expo Router screens (tabs + modal routes)
├── components/     ui/ primitives, devices/, transfers/, files/
├── features/       discovery, transfers, device, settings, history — Layer B
├── lib/
│   ├── protocol/   versioned types, constants, hand-rolled validation — Layer C
│   ├── networking/ LocalNetworkService selection (real vs. dev mock)
│   ├── security/   filename sanitization, transfer-ID/replay handling
│   └── storage/    AsyncStorage-backed settings/history/trusted-devices
├── types/          shared domain types (Transfer, PeerDevice, native bridge contract)
modules/local-network/   Layer D — the native Expo Module (Kotlin + Swift)
tests/              mirrors src/ by concern; tests/discovery|storage|integration
                    have a README explaining why they need real devices instead
docs/prd/           the original specification this was built from
```

## Native module status — read before building

### Android (`modules/local-network/android`)

A complete first draft: `TlsIdentity.kt` generates a local self-signed cert
via AndroidKeyStore (no BouncyCastle — keeps the 50 MB budget), `PinnedTrustManager.kt`
does fingerprint-pinned trust for outgoing connections (never a blanket
trust-all), `UdpMulticastDiscovery.kt` handles multicast join/announce
(including the easy-to-miss `WifiManager.MulticastLock`, without which
multicast silently fails on real devices), `HttpsServer.kt` + `MiniHttp.kt`
are a minimal hand-rolled HTTP/1.1 server (no embedded-server dependency),
and `TransferManager.kt` does the actual streaming/digesting/atomic-commit
work. `LocalNetworkModule.kt` wires it all into the Expo Modules API.

Known simplifications worth revisiting:
- **File digest verification double-reads each file** (once to hash, once
  to stream) to satisfy "verify before commit" without HTTP trailers. A
  future protocol version could use chunked encoding or a two-phase
  handshake to avoid this.
- **No chunked transfer-encoding support** — every request has a known
  length up front, which is true for heishare's own protocol, but means
  this HTTP layer isn't reusable for anything more general.
- Received files land in `getExternalFilesDir(null)/heishare/received` —
  the "Should have" SAF/user-chosen destination folder isn't implemented.

### iOS (`modules/local-network/ios`)

Structural skeleton only — see the large comment at the top of
`LocalNetworkModule.swift`. The one substantive decision already made:
**iOS should discover peers via Bonjour (`NWBrowser`/`NWListener`), not raw
UDP multicast.** Apple gates raw IP multicast behind a special
"Multicast Networking" entitlement that has to be requested and approved
separately — Bonjour sidesteps that entirely since it goes through mDNS via
a system daemon. `NSBonjourServices` is already declared in `app.json`. This
means Android and iOS use different discovery transports but the same
versioned JSON payload shape once a peer is found.

## What's genuinely verified vs. not

Verified by actually running the tools in this environment:
- `npm install` resolves cleanly.
- `npx tsc --noEmit` — zero errors, whole project.
- `npm test` — 49/49 passing. Worth noting: this caught a real bug (a
  stateful-regex edge case in the filename sanitizer mishandling nested
  `../../..`), which is exactly what these tests are for.
- `npx eslint src` — zero errors.

Not verified (no Android/iOS toolchain in this environment):
- Whether the Kotlin/Swift actually compiles.
- Multicast discovery, TLS handshake, or streaming transfer behavior on a
  real device.
- The 50 MB release-size target (`docs/prd/06-performance-and-size.md`) —
  no release build has been produced.

## Suggested next steps

1. `eas build --profile development --platform android` (or open in Android
   Studio) and fix whatever the Kotlin compiler finds — treat everything in
   `modules/local-network/android` as a draft, not a known-working baseline.
2. Once two Android devices can discover and transfer with each other,
   implement the iOS Swift bodies against the same protocol.
3. Phase 6/7/8 from `docs/prd/07-implementation-roadmap.md` (security
   hardening pass, performance benchmarking, cross-device test matrix) —
   none of that has started.
