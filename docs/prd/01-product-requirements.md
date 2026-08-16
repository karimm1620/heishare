# LocalShare — Product Requirements

## 1. Problem

Users often need to move files or short text between nearby devices without uploading content to a cloud service, sending it through a messaging platform, or depending on internet connectivity.

LocalShare solves this by turning participating devices into peers on the same reachable local network.

## 2. Product goals

### Must have

- Cross-platform mobile application architecture.
- Nearby-device discovery over the local network.
- Direct peer-to-peer file transfer.
- Direct text sharing.
- Multiple-file selection.
- Transfer queue.
- Transfer progress.
- Incoming transfer approval.
- Cancel transfer.
- Success/error states.
- Device identity/alias.
- Local HTTPS/TLS communication.
- Local REST-style API.
- No internet requirement for core functionality.
- No external server.
- No account.
- No subscription.
- No cloud storage.

### Should have

- QR/manual connection fallback.
- Copy/share local device address for troubleshooting.
- Transfer history stored locally.
- Favorite/trusted devices.
- Configurable device alias.
- Configurable local listening port, while retaining `53317` as the default.
- Dark/light appearance.
- System-native sharing/file picker integrations where practical.

### Explicitly out of scope for v1

- Public internet file sharing.
- Cloud backup.
- User accounts.
- Social features.
- End-to-end messaging infrastructure beyond direct transfer/text payloads.
- Advertising.
- Analytics.
- Remote server relay.
- Always-on background sync.
- Large third-party SDK stacks that threaten the 50 MB target.

## 3. Core user journeys

### 3.1 Send files

1. User opens LocalShare.
2. App starts local networking services.
3. App discovers reachable peer devices.
4. User chooses a device.
5. User selects one or more files.
6. App creates a transfer preparation request.
7. Receiver sees the incoming transfer request.
8. Receiver accepts or rejects.
9. Sender uploads file bytes directly to the receiver.
10. Both devices show progress.
11. Receiver verifies completion.
12. Receiver stores the file safely.
13. Sender sees a completed result.

### 3.2 Receive files

1. App advertises itself on the local network.
2. App accepts discovery traffic on the configured port.
3. Sender prepares a transfer.
4. Receiver shows sender identity, file names, sizes, and aggregate size.
5. User accepts or rejects.
6. App streams data to temporary storage.
7. Integrity is verified.
8. Temporary data is atomically promoted to its final destination.
9. App reports success or failure.

### 3.3 Send text

1. User chooses a nearby device.
2. User enters or pastes text.
3. App shows a preview.
4. Sender submits the text to the selected peer.
5. Receiver accepts or rejects when the transfer mode requires confirmation.
6. Receiver can copy or save the text locally.

## 4. Device discovery

Discovery should use the local-network model documented by LocalSend as the reference architecture:

- UDP multicast as the primary discovery path.
- HTTP/HTTPS registration as a fallback mechanism where multicast is unavailable.
- Default multicast group reference: `224.0.0.167`.
- Default port reference: `53317`.

The product does not have to claim protocol interoperability with LocalSend unless that is explicitly implemented and tested. The first release can use a versioned LocalShare protocol while following the same local-network design principles.

## 5. Transfer behavior

- Multiple files may be included in one transfer request.
- Transfer progress must be based on actual bytes sent/received.
- The receiver must not expose partial files as completed files.
- File names must be sanitized before writing to storage.
- Duplicate names must use a deterministic collision policy.
- A canceled transfer must stop network activity and release resources.
- A failed transfer must clean up temporary files.
- A completed transfer should survive an app restart because the destination is already committed.
- The app must not load an entire large file into JavaScript memory.

## 6. Device identity

Each device has:

- Human-readable alias.
- Platform/device type.
- Protocol version.
- Listening port.
- Supported transport/security mode.
- Certificate fingerprint or equivalent local identity.
- Capability flags.

Aliases are for UI only and must not be treated as authentication credentials.

## 7. Reliability requirements

The app must handle:

- Device disappearing during discovery.
- Wi-Fi changing.
- Local IP changing.
- Network temporarily becoming unavailable.
- Receiver rejecting a transfer.
- Sender canceling.
- Receiver canceling.
- Connection timeout.
- TLS handshake failure.
- Insufficient storage.
- File permission failure.
- Duplicate destination file.
- Unsupported file provider.
- Backgrounding during transfer, subject to platform constraints.

## 8. UX principles

- The main screen must immediately communicate whether the device is discoverable.
- Nearby peers should appear without requiring manual IP entry in the normal path.
- The send flow should have as few steps as possible.
- Incoming requests must be visually distinct from completed transfers.
- Progress must remain readable for both tiny and very large transfers.
- Errors must explain the actionable cause instead of exposing raw stack traces.
