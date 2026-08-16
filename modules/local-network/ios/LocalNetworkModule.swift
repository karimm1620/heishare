import ExpoModulesCore
import Network
import CryptoKit
import Security

/**
 * iOS counterpart to the Android LocalNetworkModule. This is an earlier-
 * stage skeleton than the Android side (modules/local-network/android) —
 * it establishes the structure and the one genuinely important iOS-specific
 * design decision below, but the TCP/TLS/streaming bodies are TODO stubs.
 * Needs real Xcode iteration; this sandbox has no macOS/Xcode toolchain to
 * verify against (see README.md "Native module status").
 *
 * IMPORTANT PLATFORM DIFFERENCE — discovery:
 * heishare's primary discovery path (02-networking-architecture.md §4) is
 * raw UDP multicast on 224.0.0.167:53317. On iOS, sending/receiving raw IP
 * multicast from an app requires Apple's special
 * "Multicast Networking" entitlement (com.apple.developer.networking.multicast),
 * which must be requested from Apple and is not granted by default — see
 * https://developer.apple.com/contact/request/networking-multicast .
 * Until/unless that's granted, iOS should discover peers via Bonjour
 * (NWBrowser/NWListener with `.bonjour(type: "_heishare._tcp", domain: nil)`)
 * instead — Bonjour uses mDNS through a system daemon rather than a raw
 * multicast socket, so it doesn't need that entitlement. NSBonjourServices
 * is already declared in app.json's ios.infoPlist for this reason. This
 * means Android and iOS use different discovery transports but the same
 * versioned JSON announcement shape once a peer is found — the 02-networking
 * doc's "HTTP registration as a fallback" path is effectively iOS's primary
 * path today, not a rare fallback.
 */
public class LocalNetworkModule: Module {
  private var listener: NWListener?
  private var browser: NWBrowser?
  private var selfDeviceId: String = ""
  private var selfAlias: String = ""
  private var boundPort: UInt16 = 0

  public func definition() -> ModuleDefinition {
    Name("LocalNetwork")

    Events(
      "onDeviceDiscovered",
      "onDeviceLost",
      "onIncomingTransferRequest",
      "onTransferDecision",
      "onTransferProgress",
      "onServerError"
    )

    AsyncFunction("start") { (config: [String: Any]) in
      self.selfDeviceId = config["deviceId"] as? String ?? ""
      self.selfAlias = config["alias"] as? String ?? "heishare device"
      let port = (config["port"] as? Int).map { UInt16($0) } ?? 53317
      try self.startServer(preferredPort: port)
      // TODO: generate/load a local TLS identity via SecKeyCreateRandomKey +
      // a self-signed SecCertificate, analogous to TlsIdentity.kt on
      // Android, and configure NWParameters with tlsOptions using it. See
      // Apple's "Setting Up an HTTPS Server with Network.framework" sample.
    }

    AsyncFunction("stop") {
      self.listener?.cancel()
      self.listener = nil
      self.browser?.cancel()
      self.browser = nil
    }

    AsyncFunction("getLocalAddresses") { () -> [String] in
      // TODO: enumerate en0/awdl0/etc via getifaddrs(), mirroring
      // LocalNetworkModule.kt's localIpv4Addresses().
      return []
    }

    AsyncFunction("getInfo") { () -> [String: Any?] in
      [
        "running": self.listener != nil,
        "addresses": [] as [String],
        "port": self.boundPort != 0 ? Int(self.boundPort) : nil,
        "fingerprint": nil,
      ]
    }

    AsyncFunction("startDiscovery") {
      // TODO: NWBrowser(for: .bonjour(type: "_heishare._tcp", domain: nil), using: .tcp)
      // — see the platform-difference note above for why Bonjour, not
      // multicast, is the right default here.
    }

    AsyncFunction("stopDiscovery") {
      self.browser?.cancel()
      self.browser = nil
    }

    AsyncFunction("sendAnnouncement") { (_: [String: Any]) in
      // No-op under Bonjour discovery: NWListener's service advertisement
      // IS the announcement: publishing it in startServer()/startDiscovery()
      // is sufficient, there's no separate periodic packet to send.
    }

    AsyncFunction("prepareUpload") { (_: [String: Any]) in
      // TODO: open an NWConnection to the peer, send the versioned
      // prepare-upload request, await the response — mirrors
      // TransferManager.prepareUpload() on Android.
      throw NotImplementedIOSNetworkingError()
    }

    AsyncFunction("startUpload") { (_: String) in
      throw NotImplementedIOSNetworkingError()
    }

    AsyncFunction("sendText") { (_: [String: Any]) in
      throw NotImplementedIOSNetworkingError()
    }

    AsyncFunction("respondToTransfer") { (_: String, _: Bool) in
      throw NotImplementedIOSNetworkingError()
    }

    AsyncFunction("cancelTransfer") { (_: String) in
      throw NotImplementedIOSNetworkingError()
    }

    OnDestroy {
      self.listener?.cancel()
      self.browser?.cancel()
    }
  }

  private func startServer(preferredPort: UInt16) throws {
    // TODO: NWListener(using: tlsParameters, on: NWEndpoint.Port(rawValue: preferredPort) ?? .any)
    // then mirror HttpsServer.kt's request routing on top of the accepted
    // NWConnections. Falling back to an ephemeral port on bind failure,
    // same as the Android side, once this is implemented.
  }
}

struct NotImplementedIOSNetworkingError: Error, CustomStringConvertible {
  var description: String {
    "heishare's iOS native networking is a structural skeleton only — see modules/local-network/ios/LocalNetworkModule.swift"
  }
}
