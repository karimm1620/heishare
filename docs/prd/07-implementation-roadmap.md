# LocalShare — Implementation Roadmap & Definition of Done

## Phase 0 — Project bootstrap

- [ ] Create Expo SDK 57 project from the official SDK 57 template.
- [ ] Configure Expo Router.
- [ ] Configure TypeScript.
- [ ] Configure NativeWind 4.
- [ ] Configure React Native Reusables.
- [ ] Install/configure `@expo/ui`.
- [ ] Establish linting/formatting/type-checking.
- [ ] Establish a minimal test setup.
- [ ] Keep the dependency tree minimal.

Definition of done:
- Project starts successfully.
- TypeScript passes.
- Router renders.
- NativeWind renders.
- Reusables components render.
- Android Jetpack Compose proof-of-concept renders through `Host`.

## Phase 1 — Native networking spike

- [ ] Implement a minimal local TCP server.
- [ ] Implement a minimal UDP socket.
- [ ] Implement UDP multicast discovery.
- [ ] Confirm local port `53317`.
- [ ] Confirm inbound/outbound firewall model.
- [ ] Confirm local HTTPS/TLS server capability.
- [ ] Confirm native streaming file I/O.

Definition of done:
- Two physical devices on the same reachable Wi-Fi can exchange discovery packets.
- One device can make a secure local request to the other.
- The networking implementation does not depend on an external server.

## Phase 2 — Protocol

- [ ] Create versioned protocol types.
- [ ] Implement register endpoint.
- [ ] Implement prepare-upload.
- [ ] Implement upload.
- [ ] Implement cancel.
- [ ] Implement text.
- [ ] Implement info/diagnostics.
- [ ] Add schema validation.
- [ ] Add transfer state machine.

Definition of done:
- Protocol tests pass.
- Invalid payloads fail safely.
- Transfer state cannot skip illegal transitions.

## Phase 3 — File transfer

- [ ] Native file streaming.
- [ ] Temporary file handling.
- [ ] Atomic finalization.
- [ ] Integrity digest.
- [ ] Collision-safe filename handling.
- [ ] Cancellation.
- [ ] Progress events.
- [ ] Error propagation.

Definition of done:
- Small files work.
- Large files work without loading into JS memory.
- Corrupted/incomplete transfers are never presented as completed.

## Phase 4 — Discovery UX

- [ ] Device list.
- [ ] Device alias.
- [ ] Local-network state.
- [ ] Discovery timeout handling.
- [ ] Manual fallback diagnostics.
- [ ] QR/manual connection only if needed.

Definition of done:
- Users can find a peer without manually typing an IP in the normal flow.

## Phase 5 — Production UI

- [ ] Home.
- [ ] Send.
- [ ] Incoming request.
- [ ] Transfer progress.
- [ ] History.
- [ ] Settings.
- [ ] Dark/light mode.
- [ ] Accessibility.
- [ ] Empty/error/loading states.

Definition of done:
- Core flows are understandable without developer knowledge.

## Phase 6 — Security hardening

- [ ] Secure key/certificate storage.
- [ ] Fingerprint handling.
- [ ] TLS verification.
- [ ] Request size limits.
- [ ] Replay/expiration checks.
- [ ] Path sanitization.
- [ ] Resource limits.
- [ ] Sensitive-log audit.

Definition of done:
- Security tests pass.
- No private keys or file contents appear in logs.

## Phase 7 — Performance and size

- [ ] Release-size audit.
- [ ] Dependency audit.
- [ ] Startup profiling.
- [ ] Memory profiling.
- [ ] Transfer throughput profiling.
- [ ] Progress-event profiling.
- [ ] Remove unused assets/dependencies.

Definition of done:
- Release build satisfies the 50 MB target or clearly documents the remaining blocker.
- Benchmarks are recorded.
- No known performance regression remains unexplained.

## Phase 8 — Cross-device validation

Test matrix:

- Android → Android
- Android → iOS
- iOS → Android
- iOS → iOS
- Different Wi-Fi routers
- Hotspot where supported
- Network with AP isolation
- IPv4-only network
- Changing local IP
- App background/foreground
- Sender cancellation
- Receiver rejection
- Receiver storage failure
- TLS failure
- Device disappearance during transfer

## Final definition of done

The app is ready for release only when:

- Core local sharing works without internet.
- Direct transfer works end-to-end.
- TLS is enabled and verified.
- Discovery works on normal local networks.
- Failure modes are handled.
- No cloud/backend is required.
- Release size is within the declared 50 MB target.
- Performance measurements are documented.
- The dependency tree is intentionally small.
