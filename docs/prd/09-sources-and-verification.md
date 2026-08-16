# LocalShare — Sources & Verification Notes

## User-provided references

- Expo create project: https://docs.expo.dev/get-started/create-a-project/index.md
- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
- NativeWind 4 installation: https://www.nativewind.dev/docs/getting-started/installation
- React Native Reusables: https://reactnativereusables.com/docs

## Verified documentation

Expo's SDK 57 project creation documentation recommends using the explicit SDK 57 template selector:

```bash
npx create-expo-app@latest --template default@sdk-57
```

Expo Router is included/configured through the recommended default SDK 57 project path.

Expo UI in SDK 57 provides native UI backed by Jetpack Compose on Android. The Jetpack Compose components are exposed through `@expo/ui/jetpack-compose` and require a `Host` wrapper.

NativeWind's current Expo setup requires the NativeWind package and its peer/configuration dependencies. React Native Reusables' installation documentation also provides additional setup around NativeWind, Metro, and helper packages.

## LocalSend reference

LocalSend's published protocol documentation states:

- Default UDP multicast port: `53317`.
- Default HTTP/TCP port: `53317`.
- Default multicast address: `224.0.0.167`.
- The protocol uses a REST-style local API.
- HTTPS mode uses a certificate fingerprint for device identity.
- File transfer uses a preparation step followed by upload.
- LocalSend does not require an external server for the protocol.

LocalSend's application documentation lists this firewall reference:

| Direction | Protocol | Port | Action |
|---|---|---:|---|
| Incoming | TCP, UDP | 53317 | Allow |
| Outgoing | TCP, UDP | Any | Allow |

## Important interpretation

LocalShare is inspired by this architecture.

Unless the implementation explicitly adopts and tests the LocalSend protocol specification, the app must not claim full LocalSend interoperability.

The project should therefore use its own versioned protocol namespace such as:

`/api/localshare/v1/...`

while keeping the same local-only architectural principles.

## Primary references

- Expo SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/
- Expo Router SDK 57: https://docs.expo.dev/versions/v57.0.0/sdk/router/
- Expo UI SDK 57: https://docs.expo.dev/versions/v57.0.0/sdk/ui/
- Expo UI Jetpack Compose SDK 57: https://docs.expo.dev/versions/v57.0.0/sdk/ui/jetpack-compose/
- NativeWind: https://www.nativewind.dev/docs/getting-started/installation
- React Native Reusables: https://reactnativereusables.com/docs
- LocalSend protocol: https://github.com/localsend/protocol
- LocalSend application: https://github.com/localsend/localsend
