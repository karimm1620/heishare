# LocalShare — Security & Transfer Protocol

## 1. Security goals

The application is designed to protect local transfers from accidental exposure and unauthorized acceptance.

Core principles:

- Local-only by architecture.
- HTTPS/TLS for payload traffic.
- Explicit receiver consent.
- Device fingerprints.
- No cloud relay.
- No private keys in JavaScript logs.
- No sensitive payload logging.

## 2. Threat model

Protect against:

- Accidental transfer to the wrong discovered device.
- Passive observation of local network traffic.
- Untrusted devices attempting to send files.
- Malicious filenames/path traversal.
- Partial-file exposure.
- Replayed or stale transfer requests.
- Excessive resource consumption from malformed requests.

Do not claim protection against a fully compromised operating system or a hostile device that already controls the endpoint.

## 3. Device identity

Device identity is a local concept.

Suggested identity record:

```ts
type DeviceIdentity = {
  deviceId: string;
  alias: string;
  deviceType: "mobile" | "desktop" | "web" | "unknown";
  fingerprint: string;
  protocolVersion: string;
};
```

`deviceId` is an application identifier and must not be presented as a cryptographic secret.

## 4. TLS identity

The native server creates a local certificate and corresponding private key.

The private key:

- Stays on-device.
- Is stored using platform-appropriate secure storage.
- Is never included in backups unless the backup format is explicitly encrypted.
- Is never printed in logs.

The UI may show a short fingerprint to help a user compare devices.

## 5. Incoming transfer approval

Every incoming transfer should contain:

- Sender alias.
- Sender fingerprint.
- Number of files.
- File names.
- Total size.
- Transfer ID.
- Optional text preview.

Receiver decision:

- Accept.
- Reject.

Until accepted, file bytes must not be committed to their final destination.

## 6. File safety

Before writing a received file:

- Normalize the destination name.
- Strip path separators and traversal sequences.
- Reject absolute paths.
- Reject control characters that are unsupported by the platform.
- Apply a collision-safe naming policy.
- Write to a temporary location.
- Verify successful completion.
- Atomically move/rename into the final destination when supported.

Never trust a sender-provided path.

## 7. Integrity

Each file should have an integrity digest.

Preferred approach:

- Compute digest incrementally while streaming.
- Transfer metadata includes expected digest.
- Receiver computes digest from received bytes.
- Finalization succeeds only when the digest matches.

SHA-256 is a suitable default for integrity verification.

Integrity verification is not itself authentication; TLS/device identity remains part of the trust model.

## 8. Request validation

Every endpoint must validate:

- HTTP method.
- Content type.
- JSON shape.
- Maximum metadata size.
- Transfer ID format.
- File ID format.
- File count.
- Per-file size.
- Aggregate transfer size.
- Supported protocol version.

Malformed requests should fail fast without crashing the process.

## 9. Replay protection

Preparation requests should include a short-lived transfer ID and expiration.

The receiver should:

- Reject expired transfers.
- Reject reused completed transfer IDs.
- Invalidate canceled transfers.
- Avoid accepting upload requests with no valid preparation state.

## 10. Resource protection

Implement limits for:

- Simultaneous incoming preparations.
- Simultaneous uploads.
- Metadata body size.
- Discovery packet size.
- Header size.
- Connection idle time.
- Upload duration.
- Temporary storage usage.

The goal is to prevent a malformed local peer from exhausting app resources.

## 11. Logging

Production logs must never contain:

- File contents.
- Private keys.
- Full authentication/fingerprint secrets.
- User document text.
- Raw request bodies.

Safe logs:

- Event type.
- Transfer ID.
- Byte progress.
- Error category.
- Duration.
- Network state.

Verbose protocol logging must be development-only.

## 12. Text transfer

Text is treated as a first-class payload.

Requirements:

- Enforce a practical size limit.
- Escape/render text safely.
- Never execute HTML or scripts.
- Preserve Unicode correctly.
- Show sender identity and timestamp.
