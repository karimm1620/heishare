/**
 * Device identity & peer types.
 *
 * `deviceId` and `fingerprint` are *local* identifiers, not cryptographic
 * secrets or authentication credentials — see 03-security-and-transfer-protocol.md §3.
 * Aliases are for UI display only and must never be treated as authentication.
 */

export type DeviceType = 'mobile' | 'desktop' | 'web' | 'unknown';

export type TransportSecurityMode = 'https';

/** Capability flags a device advertises during discovery/registration. */
export interface DeviceCapabilities {
  /** Device can receive files. */
  receiveFiles: boolean;
  /** Device can receive plain-text payloads. */
  receiveText: boolean;
  /** Maximum simultaneous incoming uploads the device is willing to accept. */
  maxConcurrentUploads: number;
}

export const DEFAULT_CAPABILITIES: DeviceCapabilities = {
  receiveFiles: true,
  receiveText: true,
  maxConcurrentUploads: 1,
};

/** This device's own identity, generated once and persisted locally. */
export interface DeviceIdentity {
  deviceId: string;
  alias: string;
  deviceType: DeviceType;
  /** SHA-256 fingerprint of this device's local TLS certificate. */
  fingerprint: string;
  protocolVersion: string;
}

/**
 * A peer discovered on the local network (via multicast announcement or
 * registration fallback — see 02-networking-architecture.md §4).
 *
 * Deliberately excludes filenames, personal data, or anything beyond what a
 * discovery announcement is allowed to carry.
 */
export interface PeerDevice {
  deviceId: string;
  alias: string;
  deviceType: DeviceType;
  /** Local network host/IP the peer is reachable at. Diagnostics only —
   *  do not surface raw IPs in primary UI, see 04-ui-ux.md §4. */
  host: string;
  port: number;
  protocol: TransportSecurityMode;
  fingerprint: string;
  protocolVersion: string;
  capabilities: DeviceCapabilities;
  /** Epoch ms this peer was last seen via announcement or successful contact. */
  lastSeenAt: number;
  /** True once removed from the live discovery set due to staleness. */
  stale: boolean;
}

/** A peer the user has explicitly marked as trusted/favorite, persisted locally. */
export interface TrustedDevice {
  deviceId: string;
  alias: string;
  fingerprint: string;
  addedAt: number;
}
