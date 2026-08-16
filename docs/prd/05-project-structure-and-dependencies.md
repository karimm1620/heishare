# LocalShare — Project Structure & Dependency Rules

## 1. Project creation

Use the Expo SDK 57 default template with the explicit SDK 57 template selector.

Canonical starting command:

```bash
npx create-expo-app@latest localshare --template default@sdk-57
```

The SDK 57 template should be the source of truth for the initial Expo structure. Do not invent an old SDK layout.

## 2. Proposed structure

```text
localshare/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── send.tsx
│   ├── receive.tsx
│   ├── transfers.tsx
│   ├── history.tsx
│   └── settings.tsx
│
├── components/
│   ├── ui/
│   ├── devices/
│   ├── transfers/
│   └── files/
│
├── features/
│   ├── discovery/
│   ├── transfers/
│   ├── device/
│   ├── settings/
│   └── history/
│
├── lib/
│   ├── protocol/
│   ├── networking/
│   ├── security/
│   ├── storage/
│   └── platform/
│
├── modules/
│   └── local-network/
│
├── hooks/
├── store/
├── types/
├── constants/
├── utils/
├── assets/
├── scripts/
├── tests/
│
├── app.json
├── package.json
├── metro.config.js
├── babel.config.js
├── tailwind.config.js
├── global.css
└── tsconfig.json
```

The exact folders may be adjusted to the official SDK 57 template when the project is initialized. Do not add duplicate infrastructure just because this PRD lists a conceptual layer.

## 3. Dependency hierarchy

### Foundation

- Expo SDK 57
- React Native
- TypeScript
- Expo Router

### Styling / UI

- NativeWind 4
- React Native Reusables
- `@expo/ui` for native UI where justified

### Core app state

Use a minimal state solution only when React context/local state becomes insufficient.

Avoid installing a state library by default.

### Native networking

Networking requires actual native capabilities for:

- TCP server binding.
- UDP sockets and multicast.
- HTTPS server/TLS.
- Streaming file I/O.

Choose the smallest viable implementation compatible with Expo SDK 57.

Preferred architecture:

- Minimal custom Expo Module under `modules/local-network/`, or
- A proven SDK-57-compatible native networking module with active maintenance.

Do not add several overlapping socket libraries.

## 4. Dependency rules

Before adding a dependency:

1. Verify SDK 57 compatibility.
2. Check whether Expo already provides the capability.
3. Check native binary size impact.
4. Check whether the dependency adds duplicate functionality.
5. Prefer a small maintained package over a large framework.
6. Avoid packages that pull in large unrelated native SDKs.

Every dependency must have a clear reason documented in the PR.

## 5. Styling

NativeWind 4 is the primary styling layer.

React Native Reusables should provide reusable primitives where useful.

Avoid introducing another styling system.

For React Native Reusables setup, follow its current installation guidance, including any required Metro/NW configuration and helper packages.

## 6. Expo UI

`@expo/ui` is the Expo-native UI package.

For Android Jetpack Compose:

```ts
import { Host, Button } from "@expo/ui/jetpack-compose";
```

Jetpack Compose components must be placed inside the required `Host`.

Do not manually depend on arbitrary Android Compose versions unless the Expo SDK 57 package explicitly requires it.

## 7. Data storage

Local settings and small metadata can use an Expo-compatible local storage mechanism.

Transfer metadata should not require a database unless profiling proves that one is necessary.

Do not persist file bytes inside JavaScript storage.

## 8. Native module boundary

The JavaScript API should look conceptually like:

```ts
type LocalNetworkService = {
  start(config: StartConfig): Promise<void>;
  stop(): Promise<void>;
  getLocalAddresses(): Promise<string[]>;
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  sendAnnouncement(payload: DiscoveryPayload): Promise<void>;
  onDeviceDiscovered(listener: (device: PeerDevice) => void): () => void;
  onDeviceLost(listener: (deviceId: string) => void): () => void;
  onTransferProgress(listener: (event: TransferProgress) => void): () => void;
};
```

The exact API may differ, but the bridge must hide native implementation details from UI code.

## 9. Testing structure

At minimum:

```text
tests/
├── protocol/
├── security/
├── discovery/
├── transfers/
├── storage/
└── integration/
```

Tests must include real local-network integration tests for the networking layer where possible.
