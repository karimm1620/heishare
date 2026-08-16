# LocalShare — PRD Index

## 1. Product

LocalShare is a cross-platform local-network file and text sharing application inspired by the local-only communication model of LocalSend.

The product must allow nearby devices on the same local network to discover one another and transfer files or text directly between devices without an internet connection, external server, account, or cloud relay.

Core principle:

> Device A communicates directly with Device B over the local network. No external server is required for discovery, negotiation, or transfer.

## 2. Required technology baseline

- Expo SDK 57
- Expo Router
- React Native + TypeScript
- NativeWind 4
- React Native Reusables
- `@expo/ui` / Jetpack Compose components for Android-native surfaces where they materially improve the Android experience
- Local-only networking
- REST-style local API
- HTTPS/TLS for transfer and local API traffic
- TCP + UDP on local network
- Fixed default port: `53317`
- No cloud backend
- No mandatory authentication/account system
- No analytics SDK
- No unnecessary third-party runtime dependencies

Official references:

- Expo project creation: https://docs.expo.dev/get-started/create-a-project/index.md
- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
- Expo Router: https://docs.expo.dev/versions/v57.0.0/sdk/router/
- NativeWind installation: https://www.nativewind.dev/docs/getting-started/installation
- React Native Reusables: https://reactnativereusables.com/docs
- Expo UI / Jetpack Compose: https://docs.expo.dev/versions/v57.0.0/sdk/ui/jetpack-compose/

## 3. Non-negotiable constraints

1. Maximum installed application size target: 50 MB.
2. Optimize for fast startup, fast discovery, low memory use, and high transfer throughput.
3. Do not add a server hosted on the internet.
4. Do not route file contents through any third-party server.
5. Do not introduce authentication infrastructure unless it is strictly local and required for a security feature.
6. Do not replace real networking with mocked or simulated discovery in production code.
7. Do not silently change the port, transport model, or security model.
8. Keep files in this PRD directory split by responsibility. Do not consolidate everything into one giant specification file.

## 4. Default firewall traffic

| Direction | Protocol | Port | Action |
|---|---|---:|---|
| Incoming | TCP, UDP | 53317 | Allow |
| Outgoing | TCP, UDP | Any | Allow |

The implementation must document that routers with client/AP isolation can prevent device-to-device traffic even when the app is correctly configured.

## 5. Primary success criteria

- Two supported devices on the same reachable local network can discover each other.
- A user can select one or more files and send them directly.
- The receiver explicitly accepts or rejects an incoming transfer.
- Transfer progress is visible and accurate.
- Interrupted transfers fail safely and do not corrupt the destination file.
- All application payload traffic uses HTTPS/TLS.
- The app remains useful with no internet connection.
- No account or cloud service is required.
- Release builds remain within the 50 MB target when measured using the project's documented APK/AAB/IPA size methodology.

See the other PRD files for detailed requirements.
