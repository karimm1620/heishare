# LocalShare — Networking & Architecture

## 1. Architectural rule

LocalShare is a peer-to-peer local-network application.

There is no central backend in the core architecture.

Each participating device has two logical roles:

- Discovery participant.
- Local HTTP(S) server.

A device can send, receive, or do both.

## 2. Logical layers

### Layer A — UI

Expo Router screens and reusable React Native components.

Responsibilities:

- Render state.
- Start/stop user actions.
- Display transfers.
- Display devices.
- Surface errors.

UI must not contain socket or TLS implementation details.

### Layer B — Application services

Pure TypeScript services that orchestrate:

- Discovery state.
- Device state.
- Transfer queue.
- Transfer lifecycle.
- Settings.
- Local history.

These services should expose platform-independent interfaces.

### Layer C — Protocol

A versioned LocalShare protocol:

- Discovery announcement.
- Registration.
- Transfer preparation.
- Transfer upload.
- Transfer cancel.
- Optional text payload endpoint.
- Health/info endpoint.

Protocol data should use compact JSON for metadata and raw streaming bytes for file payloads.

### Layer D — Native networking bridge

This layer owns capabilities that ordinary React Native JavaScript does not provide reliably enough for this product:

- Binding a local TCP server.
- Binding a UDP socket.
- UDP multicast send/receive.
- TLS server configuration.
- Streaming file bytes without reading the whole file into JS memory.
- Platform-specific local-network permissions.
- Efficient socket lifecycle management.

The native bridge may be implemented as a minimal Expo Module or another small, SDK-57-compatible native module. The final dependency choice must be justified against app size, maintenance cost, and throughput.

Do not fake the server with `fetch()`.

## 3. Ports

Default:

- TCP: `53317`
- UDP: `53317`

Traffic reference:

| Direction | Protocol | Port | Action |
|---|---|---:|---|
| Incoming | TCP, UDP | 53317 | Allow |
| Outgoing | TCP, UDP | Any | Allow |

The implementation should allow the port to be changed when the default is unavailable, but `53317` remains the default.

## 4. Discovery

### Primary

Use UDP multicast on the local network.

Reference multicast group:

`224.0.0.167`

Each device periodically announces a small device descriptor.

A discovery announcement should include only metadata such as:

- alias
- protocol version
- device type
- listening port
- protocol (`https`)
- certificate fingerprint
- supported capabilities
- announce flag

Do not broadcast filenames or personal data.

### Fallback

When multicast is unavailable:

- Discover local network interface addresses.
- Attempt registration against plausible local addresses using short timeouts.
- Avoid long serial scans.
- Limit concurrency to prevent network flooding.
- Cache successful peers briefly.

The fallback must be bounded and cancellable.

## 5. Local API

All endpoints are versioned.

Suggested namespace:

`/api/localshare/v1/...`

Suggested endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/register` | POST | Register/discover a peer |
| `/prepare-upload` | POST | Submit transfer metadata |
| `/upload` | POST | Stream file payload |
| `/cancel` | POST | Cancel a transfer |
| `/text` | POST | Send text payload |
| `/info` | GET | Debug/health information |

The exact payload schemas must live in a separate protocol module and be covered by tests.

## 6. HTTPS/TLS

The local server must use HTTPS for application traffic.

Each device needs a local certificate/private key.

The certificate:

- Is generated locally.
- Never leaves the device as a private key.
- Has a stable fingerprint for the configured device identity.
- Can be regenerated when the user resets local identity.

The client should verify the expected peer identity using the protocol's fingerprint mechanism instead of treating arbitrary TLS certificates as automatically trusted.

Do not disable TLS verification globally.

Do not ship one shared private key in the application bundle.

## 7. Transfer pipeline

Recommended pipeline:

1. Select files.
2. Read metadata only.
3. Create transfer ID.
4. Send preparation metadata.
5. Await receiver decision.
6. Open HTTPS streaming request.
7. Stream file bytes from native filesystem to socket.
8. Update progress from byte counters.
9. Flush/complete.
10. Verify integrity.
11. Commit destination file.
12. Notify UI.

The JavaScript layer should receive progress events rather than raw data chunks.

## 8. Concurrency

Transfers should use bounded concurrency.

Do not create an unbounded promise per file.

Recommended v1 behavior:

- One active HTTP upload stream per transfer.
- A small transfer queue.
- Optional limited parallelism for independent files only after profiling.
- Discovery and UI remain responsive during transfers.

## 9. Connectivity

The networking layer must recognize that:

- Devices can be on different subnets.
- Guest Wi-Fi may isolate clients.
- AP/client isolation can prevent peer-to-peer communication.
- VPNs may change routing.
- Mobile operating systems can restrict local-network access.

The app should display actionable diagnostics when peers are visible but transfers fail.

## 10. Protocol compatibility

Do not state that LocalShare is LocalSend-compatible unless:

1. The implementation follows the LocalSend protocol specification exactly.
2. The required endpoint behavior is implemented.
3. The interoperability test suite passes.

LocalSend's published protocol uses TCP/HTTP on port `53317`, UDP multicast discovery on `224.0.0.167`, and a REST-style API. Treat those as reference architecture, not automatic compatibility requirements.

## 11. Architecture quality rules

- Keep networking isolated from UI.
- Keep protocol schemas isolated from transport code.
- Keep native code minimal.
- Prefer streaming over buffering.
- Prefer deterministic state machines over ad-hoc booleans.
- Every socket must have explicit lifecycle cleanup.
- Every request must have a timeout and cancellation strategy.
- Every transfer must have a unique ID.
