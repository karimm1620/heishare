import ExpoModulesCore
import Network
import Security
import Darwin

/**
 * iOS native local-network bridge.
 *
 * Discovery uses Bonjour/NWBrowser because raw multicast requires Apple's
 * Multicast Networking entitlement. Transfer remains fail-closed until the
 * native TLS identity + streaming server is available; we never silently
 * downgrade the PRD's HTTPS requirement to plaintext HTTP.
 */
public final class LocalNetworkModule: Module {
  private let queue = DispatchQueue(label: "com.immz.heishare.localnetwork")
  private var browser: NWBrowser?
  private var listener: NWListener?
  private var selfDeviceId = ""
  private var selfAlias = "heishare device"
  private var selfDeviceType = "mobile"
  private var selfCapabilities: [String: Any] = [:]
  private var boundPort: UInt16 = 0
  private var fingerprint: String?

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
      self.selfDeviceType = config["deviceType"] as? String ?? "mobile"
      self.selfCapabilities = config["capabilities"] as? [String: Any] ?? [:]
      let port = (config["port"] as? Int).map { UInt16(clamping: $0) } ?? 53317
      try self.startServer(preferredPort: port)
    }

    AsyncFunction("stop") {
      self.stopNetworking()
    }

    AsyncFunction("getLocalAddresses") { () -> [String] in
      Self.localIPv4Addresses()
    }

    AsyncFunction("getInfo") { () -> [String: Any?] in
      [
        "running": self.listener != nil,
        "addresses": Self.localIPv4Addresses(),
        "port": self.boundPort == 0 ? nil : Int(self.boundPort),
        "fingerprint": self.fingerprint
      ]
    }

    AsyncFunction("startDiscovery") {
      self.startDiscovery()
    }

    AsyncFunction("stopDiscovery") {
      self.browser?.cancel()
      self.browser = nil
    }

    AsyncFunction("sendAnnouncement") { (_: [String: Any]) in
      // Bonjour service publication is the iOS announcement mechanism.
    }

    AsyncFunction("prepareUpload") { (_: [String: Any]) in
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
      self.stopNetworking()
    }
  }

  // MARK: - Discovery

  private func startDiscovery() {
    browser?.cancel()

    let descriptor = NWBrowser.Descriptor.bonjour(type: "_heishare._tcp", domain: nil)
    let newBrowser = NWBrowser(for: descriptor, using: .tcp)

    newBrowser.stateUpdateHandler = { [weak self] state in
      guard let self else { return }
      if case .failed(let error) = state {
        self.emitServerError(category: "discovery", message: error.localizedDescription)
      }
    }

    newBrowser.browseResultsChangedHandler = { [weak self] _, changes in
      guard let self else { return }
      for change in changes {
        switch change {
        case .added(let result), .changed(_, let result):
          self.resolveBonjourResult(result)
        case .removed(let result):
          if let deviceId = self.serviceIdentifier(from: result) {
            self.sendEvent("onDeviceLost", ["deviceId": deviceId])
          }
        @unknown default:
          break
        }
      }
    }

    newBrowser.start(queue: queue)
    browser = newBrowser
  }

  private func resolveBonjourResult(_ result: NWBrowser.Result) {
    guard case .service(let name, _, _, _) = result.endpoint else { return }

    // A browser result already contains the peer's endpoint. We deliberately
    // do not probe it with plaintext HTTP: the transfer path must remain TLS.
    // Emit discovery metadata that is available from Bonjour immediately.
    let endpointDescription = result.endpoint.debugDescription
    let peer: [String: Any] = [
      "deviceId": name,
      "alias": name,
      "deviceType": "unknown",
      "host": endpointDescription,
      "port": Int(boundPort == 0 ? 53317 : boundPort),
      "protocol": "https",
      "fingerprint": "",
      "protocolVersion": "1.0",
      "capabilities": [:]
    ]
    sendEvent("onDeviceDiscovered", peer)
  }

  private func serviceIdentifier(from result: NWBrowser.Result) -> String? {
    guard case .service(let name, _, _, _) = result.endpoint else { return nil }
    return name == selfAlias ? nil : name
  }

  // MARK: - Server boundary

  private func startServer(preferredPort: UInt16) throws {
    // Do not create an HTTP listener here. The PRD requires HTTPS and
    // certificate/fingerprint verification. This boundary is intentionally
    // fail-closed until the TLS identity and streaming request router are
    // implemented with Network.framework.
    throw NotImplementedIOSNetworkingError()
  }

  private func stopNetworking() {
    listener?.cancel()
    listener = nil
    browser?.cancel()
    browser = nil
    boundPort = 0
  }

  private func emitServerError(category: String, message: String) {
    sendEvent("onServerError", ["category": category, "message": message])
  }

  // MARK: - Addresses

  private static func localIPv4Addresses() -> [String] {
    var addresses: [String] = []
    var cursor: UnsafeMutablePointer<ifaddrs>?
    guard getifaddrs(&cursor) == 0, let first = cursor else { return addresses }
    defer { freeifaddrs(first) }

    var current: UnsafeMutablePointer<ifaddrs>? = first
    while let interface = current {
      let flags = interface.pointee.ifa_flags
      let isUp = (flags & UInt32(IFF_UP)) != 0
      let isLoopback = (flags & UInt32(IFF_LOOPBACK)) != 0
      guard let address = interface.pointee.ifa_addr else {
        current = interface.pointee.ifa_next
        continue
      }

      if isUp && !isLoopback && address.pointee.sa_family == UInt8(AF_INET) {
        var hostBuffer = [CChar](repeating: 0, count: Int(NI_MAXHOST))
        var sockaddr = address.pointee
        let result = getnameinfo(
          &sockaddr,
          socklen_t(sockaddr.sa_len),
          &hostBuffer,
          socklen_t(hostBuffer.count),
          nil,
          0,
          NI_NUMERICHOST
        )
        if result == 0 {
          let value = String(cString: hostBuffer)
          if !value.isEmpty && !addresses.contains(value) {
            addresses.append(value)
          }
        }
      }
      current = interface.pointee.ifa_next
    }
    return addresses
  }
}

struct NotImplementedIOSNetworkingError: Error, CustomStringConvertible {
  var description: String {
    "heishare iOS TLS/streaming transfer server is not implemented yet; refusing to downgrade to HTTP."
  }
}
