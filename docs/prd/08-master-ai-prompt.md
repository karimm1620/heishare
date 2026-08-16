# LocalShare — Master AI Coding Prompt

You are building a production-quality cross-platform local-network sharing application named **LocalShare**.

Do not reinterpret the product. Follow this specification literally.

## Product definition

LocalShare is a cross-platform application for sharing files and short text directly between nearby devices over a reachable local network.

It is inspired by LocalSend's architecture:

> cross-platform local communication using a REST-style API and HTTPS encryption, without external servers or an internet connection.

The application must work without an internet connection for its core discovery and transfer functionality.

There is NO cloud relay, NO central backend, NO required account, NO subscription, and NO third-party file server.

## Required stack

Use exactly this baseline:

- Expo SDK 57
- Expo Router
- React Native
- TypeScript
- NativeWind 4
- React Native Reusables
- `@expo/ui` with Jetpack Compose components for Android-native UI where appropriate

Official references:

- https://docs.expo.dev/get-started/create-a-project/index.md
- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/versions/v57.0.0/sdk/router/
- https://www.nativewind.dev/docs/getting-started/installation
- https://reactnativereusables.com/docs
- https://docs.expo.dev/versions/v57.0.0/sdk/ui/jetpack-compose/

## Project bootstrap

Use the official SDK 57 template:

```bash
npx create-expo-app@latest localshare --template default@sdk-57
```

Do not accidentally initialize SDK 54.

Do not replace the official SDK 57 structure with an arbitrary older Expo layout.

## Most important technical constraint

React Native JavaScript alone is not sufficient as the full implementation of the local receiving server, UDP multicast, TLS server, and high-performance streaming layer.

Therefore:

- Create a minimal native networking layer.
- Prefer a minimal Expo Module under `modules/local-network/` when that produces the smallest, most controllable result.
- A third-party networking module may be used only when it is verified to support Expo SDK 57 and does not create unnecessary binary bloat.
- Do NOT fake the server using `fetch()`.
- Do NOT create an internet backend.
- Do NOT route files through an external endpoint.

The JavaScript layer must consume a clean typed API from the native module.

## Network model

Default port:

`53317`

Firewall reference:

| Direction | Protocol | Port | Action |
|---|---|---:|---|
| Incoming | TCP, UDP | 53317 | Allow |
| Outgoing | TCP, UDP | Any | Allow |

Use UDP multicast as the primary discovery mechanism.

Reference multicast group:

`224.0.0.167`

Use local HTTPS/TLS for application traffic.

Use a versioned local API, for example:

`/api/localshare/v1/...`

Suggested endpoints:

- `POST /register`
- `POST /prepare-upload`
- `POST /upload`
- `POST /cancel`
- `POST /text`
- `GET /info`

The product does NOT automatically claim LocalSend protocol compatibility. Only claim compatibility if the complete LocalSend protocol is implemented and tested.

## Security rules

HTTPS/TLS is mandatory for application traffic.

Each device must generate and keep its own private key locally.

Never:

- ship a shared private key,
- log private keys,
- disable TLS verification globally,
- trust every certificate blindly,
- expose file paths received from peers,
- write files directly to arbitrary sender-specified paths.

Use a local certificate fingerprint/device identity model.

The user must have an opportunity to identify the sending device before accepting an incoming transfer.

Sanitize filenames.

Use temporary files.

Commit the destination only after successful completion and integrity verification.

Use an incremental SHA-256 digest or an equivalent strong integrity mechanism.

Reject expired/reused transfer IDs.

Apply metadata, request, connection, concurrency, and storage limits.

## Transfer rules

File bytes must be streamed.

Never load large files fully into JavaScript memory.

Never base64-encode large file payloads.

Native code should handle file-to-socket streaming whenever possible.

JS receives progress events instead of raw binary chunks.

Progress updates must be throttled/coalesced so React is not updated for every socket chunk.

Transfers must support:

- multiple files,
- progress,
- cancellation,
- receiver rejection,
- failure cleanup,
- storage failure handling,
- deterministic duplicate-name handling.

## Performance requirements

Performance is a first-class requirement.

Priorities:

1. Reliable transfers.
2. High throughput.
3. Low memory usage.
4. Fast discovery.
5. Fast startup.
6. Low idle overhead.
7. Small release binary.

Never sacrifice TLS/security just to make a benchmark look better.

Use measured benchmarks.

At minimum benchmark:

- discovery latency,
- 100 MB transfer,
- 1 GB transfer,
- multi-file transfer,
- text transfer,
- cancellation latency,
- startup,
- memory usage,
- release size.

## Hard app-size constraint

Target maximum release application size:

**50 MB**

The size target applies to the actual release artifact, not merely the JS bundle.

Before adding any package:

1. Verify Expo SDK 57 compatibility.
2. Check whether Expo already provides the feature.
3. Estimate native binary impact.
4. Check whether an existing dependency already provides the capability.
5. Prefer the smallest maintained option.

Do not add large UI libraries, analytics SDKs, cloud SDKs, authentication SDKs, or duplicate networking stacks.

## UI requirements

Use:

- Expo Router for navigation.
- NativeWind 4 for styling.
- React Native Reusables for reusable primitives.
- `@expo/ui/jetpack-compose` only where Android-native UI has a meaningful benefit.

Every Jetpack Compose component must be inside the required `Host`.

Do not force Jetpack Compose into the entire application.

Core screens:

- Home / nearby devices
- Send
- Incoming request
- Active transfers
- Transfer history
- Settings

Core UI must clearly show:

- device alias,
- discoverability/network state,
- nearby peers,
- file selection,
- incoming request details,
- progress,
- success/failure.

Avoid:

- visual clutter,
- unnecessary animations,
- heavy blur,
- huge assets,
- gratuitous gradients,
- giant dashboard cards,
- re-rendering whole screens on transfer progress.

## Architecture requirements

Keep this separation:

```text
UI
  ↓
Application Services
  ↓
Protocol
  ↓
Native Networking Module
  ↓
TCP / UDP / TLS / Filesystem
```

UI must not implement socket logic.

Protocol schemas must not be embedded inside components.

Native code must not contain business/UI decisions.

Every networking resource must have deterministic cleanup.

Every request needs timeout and cancellation behavior.

Use state machines for transfer lifecycle.

## Suggested structure

```text
app/
components/
features/
lib/
modules/local-network/
hooks/
store/
types/
constants/
utils/
assets/
scripts/
tests/
```

Follow the actual Expo SDK 57 project structure where it differs from this conceptual structure.

## Development rules

Before writing substantial code:

1. Read the official Expo SDK 57 documentation.
2. Read the NativeWind 4 installation documentation.
3. Read React Native Reusables installation documentation.
4. Read Expo UI Jetpack Compose documentation.
5. Inspect the dependency graph of the project.
6. Confirm which networking features must be native.

Do not invent APIs from memory when official documentation is available.

When a package is proposed, verify its current compatibility before using it.

## Required implementation order

### Step 1 — Bootstrap
Create the SDK 57 project and establish Router, NativeWind, Reusables, TypeScript, and Expo UI.

### Step 2 — Native networking spike
Prove TCP server, UDP multicast, local HTTPS/TLS, and streaming file I/O on physical devices.

### Step 3 — Protocol
Implement versioned discovery, registration, preparation, upload, cancel, text, and info endpoints.

### Step 4 — Transfer engine
Implement streaming, integrity, temporary files, atomic finalization, cancellation, and progress.

### Step 5 — Discovery UI
Show nearby devices and network diagnostics.

### Step 6 — Transfer UI
Implement sender flow, receiver approval, progress, success/error states.

### Step 7 — Security hardening
Implement certificate identity/fingerprints, validation, replay protection, path sanitization, and resource limits.

### Step 8 — Performance
Benchmark throughput, memory, startup, discovery, and binary size.

### Step 9 — Cross-platform validation
Validate Android/iOS peer combinations and common local-network failure conditions.

## Non-negotiable anti-patterns

Do not:

- add a cloud backend,
- add Firebase,
- add Supabase,
- add Clerk,
- add analytics,
- add a messaging server,
- upload files to a proxy,
- use base64 for large files,
- hold entire files in JS memory,
- use one global polling loop for everything,
- spam React state updates per packet,
- add multiple networking libraries with overlapping responsibilities,
- disable TLS verification globally,
- hard-code one shared private key,
- make the 50 MB requirement an afterthought.

## Expected output behavior

Work incrementally.

After each major implementation step:

- run type checking,
- run tests,
- run the app,
- validate the affected feature,
- fix errors before moving on.

Do not silently skip native implementation problems.

When a native capability cannot be implemented with an existing Expo package, create the smallest justified native module instead of inventing a fake JavaScript-only solution.

## Final acceptance criteria

The implementation is acceptable only when:

- Two devices on the same reachable local network can discover each other.
- The default port is `53317`.
- TCP and UDP traffic match the required firewall reference.
- Local HTTPS/TLS is used.
- Files move directly between peers.
- No internet/backend is required.
- Transfers stream without loading large files into JS memory.
- Incoming transfers require explicit user acceptance/rejection.
- Partial files are not committed as completed.
- Integrity is verified.
- Errors are handled cleanly.
- UI remains responsive during transfers.
- Release size targets 50 MB maximum.
- Performance is measured rather than assumed.
- The architecture remains maintainable and dependency-light.

Do not change product scope or architecture without recording the reason in the project documentation.
