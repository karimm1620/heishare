package expo.modules.localnetwork

import org.json.JSONObject
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * JS-facing entry point (Name("LocalNetwork")) — see
 * modules/local-network/src/index.ts for the typed JS wrapper and
 * src/types/native-module.ts for the app-facing contract this implements.
 *
 * NOTE: unverified in this sandbox — this project has no Gradle/Android
 * toolchain access here (see README.md "Native module status"). Structure
 * and API usage follow the standard Expo Modules Kotlin conventions; treat
 * this as a strong first draft to compile and iterate on via `eas build`
 * or Android Studio, not as already-proven code.
 */
class LocalNetworkModule : Module(), LocalNetworkEventSink {

  private val identity = TlsIdentity()
  private val transferManager by lazy { TransferManager(requireContext(), this) }
  private val httpsServer by lazy { HttpsServer(transferManager, this) }
  private var discovery: UdpMulticastDiscovery? = null
  private var announceScheduler: ScheduledExecutorService? = null
  private val discoveryRunning = AtomicBoolean(false)

  private var selfDeviceId: String = ""
  private var selfAlias: String = ""
  private var selfDeviceType: String = "unknown"
  private var selfCapabilities: JSONObject = JSONObject()

  override fun definition() = ModuleDefinition {
    Name("LocalNetwork")

    Events(
      "onDeviceDiscovered",
      "onDeviceLost",
      "onIncomingTransferRequest",
      "onTransferDecision",
      "onTransferProgress",
      "onServerError",
    )

    AsyncFunction("start") { config: Map<String, Any?> ->
      selfDeviceId = config["deviceId"] as? String ?: ""
      selfAlias = config["alias"] as? String ?: "heishare device"
      selfDeviceType = config["deviceType"] as? String ?: "mobile"
      @Suppress("UNCHECKED_CAST")
      selfCapabilities = (config["capabilities"] as? Map<String, Any?>)?.toJSONObject() ?: JSONObject()
      val port = (config["port"] as? Number)?.toInt() ?: DEFAULT_PORT

      transferManager.selfDeviceId = selfDeviceId
      transferManager.selfAlias = selfAlias
      identity.ensureGenerated()
      transferManager.selfFingerprint = identity.fingerprint()

      val sslContext = SslContextFactory.build(identity)
      httpsServer.start(sslContext, port)
    }

    AsyncFunction("stop") {
      httpsServer.stop()
      stopDiscoveryInternal()
    }

    AsyncFunction("getLocalAddresses") {
      localIpv4Addresses()
    }

    AsyncFunction("getInfo") {
      mapOf(
        "running" to (httpsServer.boundPort != 0),
        "addresses" to localIpv4Addresses(),
        "port" to if (httpsServer.boundPort != 0) httpsServer.boundPort else null,
        "fingerprint" to if (selfAlias.isNotEmpty()) identity.fingerprint() else null,
      )
    }

    AsyncFunction("startDiscovery") {
      startDiscoveryInternal()
    }

    AsyncFunction("stopDiscovery") {
      stopDiscoveryInternal()
    }

    AsyncFunction("sendAnnouncement") { payload: Map<String, Any?> ->
      discovery?.sendAnnouncement(payload.toJSONObject())
    }

    AsyncFunction("prepareUpload") { request: Map<String, Any?> ->
      transferManager.prepareUpload(request.toJSONObject())
    }

    AsyncFunction("startUpload") { transferId: String ->
      transferManager.startUpload(transferId)
    }

    AsyncFunction("sendText") { request: Map<String, Any?> ->
      transferManager.sendText(request.toJSONObject())
    }

    AsyncFunction("respondToTransfer") { transferId: String, accept: Boolean ->
      transferManager.respondToTransfer(transferId, accept)
    }

    AsyncFunction("cancelTransfer") { transferId: String ->
      transferManager.cancelTransfer(transferId)
    }

    OnDestroy {
      httpsServer.stop()
      stopDiscoveryInternal()
      transferManager.shutdown()
    }
  }

  // ---------------------------------------------------------------------

  private fun startDiscoveryInternal() {
    if (discoveryRunning.getAndSet(true)) return

    val d = UdpMulticastDiscovery(
      appContext = requireContext(),
      groupAddress = MULTICAST_GROUP,
      port = httpsServer.boundPort.takeIf { it != 0 } ?: DEFAULT_PORT,
      selfDeviceId = selfDeviceId,
    ) { announced -> onDeviceDiscovered(announceToPeerPayload(announced)) }
    d.start()
    discovery = d

    val scheduler = Executors.newSingleThreadScheduledExecutor()
    scheduler.scheduleWithFixedDelay(
      { d.sendAnnouncement(buildSelfAnnouncement(announce = true)) },
      0,
      ANNOUNCE_INTERVAL_SECONDS,
      TimeUnit.SECONDS,
    )
    announceScheduler = scheduler
  }

  private fun stopDiscoveryInternal() {
    if (!discoveryRunning.getAndSet(false)) return
    discovery?.sendAnnouncement(buildSelfAnnouncement(announce = false)) // best-effort "leaving" notice
    announceScheduler?.shutdownNow()
    announceScheduler = null
    discovery?.stop()
    discovery = null
  }

  private fun buildSelfAnnouncement(announce: Boolean): JSONObject =
    JSONObject()
      .put("deviceId", selfDeviceId)
      .put("alias", selfAlias)
      .put("protocolVersion", TransferManager.PROTOCOL_VERSION)
      .put("deviceType", selfDeviceType)
      .put("port", httpsServer.boundPort)
      .put("protocol", "https")
      .put("fingerprint", identity.fingerprint())
      .put("capabilities", selfCapabilities)
      .put("announce", announce)

  /** A discovery announcement doesn't carry the sender's IP in its JSON
   *  payload — UdpMulticastDiscovery attaches the UDP packet's source
   *  address as a "host" field before invoking this callback, matching
   *  what sendEvent("onDeviceDiscovered", ...) is expected to carry. */
  private fun announceToPeerPayload(announced: JSONObject): JSONObject = announced

  private fun localIpv4Addresses(): List<String> =
    NetworkInterface.getNetworkInterfaces()?.toList()?.flatMap { iface ->
      if (!iface.isUp || iface.isLoopback) return@flatMap emptyList<String>()
      iface.inetAddresses.toList().filterIsInstance<Inet4Address>().map { it.hostAddress ?: "" }
    }?.filter { it.isNotEmpty() } ?: emptyList()

  private fun requireContext() =
    appContext.reactContext ?: throw IllegalStateException("heishare: React context is not available")

  // --- LocalNetworkEventSink -------------------------------------------

  override fun onDeviceDiscovered(payload: JSONObject) {
    sendEvent("onDeviceDiscovered", payload.toMap())
  }

  override fun onDeviceLost(deviceId: String) {
    sendEvent("onDeviceLost", mapOf("deviceId" to deviceId))
  }

  override fun onIncomingTransferRequest(payload: JSONObject) {
    sendEvent("onIncomingTransferRequest", payload.toMap())
  }

  override fun onTransferDecision(transferId: String, accepted: Boolean) {
    sendEvent("onTransferDecision", mapOf("transferId" to transferId, "accepted" to accepted))
  }

  override fun onTransferProgress(payload: JSONObject) {
    sendEvent("onTransferProgress", payload.toMap())
  }

  override fun onServerError(category: String, message: String) {
    sendEvent("onServerError", mapOf("category" to category, "message" to message))
  }

  companion object {
    private const val DEFAULT_PORT = 53317
    private const val MULTICAST_GROUP = "224.0.0.167"
    private const val ANNOUNCE_INTERVAL_SECONDS = 3L
  }
}

private fun Map<String, Any?>.toJSONObject(): JSONObject = (this as Map<*, *>).toJSONObject()
