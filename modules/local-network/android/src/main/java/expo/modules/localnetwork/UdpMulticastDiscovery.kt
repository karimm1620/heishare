package expo.modules.localnetwork

import android.content.Context
import android.net.wifi.WifiManager
import android.util.Log
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.MulticastSocket
import java.net.NetworkInterface
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * UDP multicast discovery — 02-networking-architecture.md §4. Reference
 * group 224.0.0.167:53317 (heishare's own versioned payload shape, not a
 * claim of LocalSend interoperability — see 09-sources-and-verification.md).
 *
 * IMPORTANT (Android-specific, easy to miss): multicast packets are dropped
 * by the Wi-Fi radio's power-saving filters unless the app holds a
 * WifiManager.MulticastLock while the socket is open. This class acquires
 * one in start() and releases it in stop() — omitting this is a common
 * cause of "discovery works on emulator, silently fails on real device."
 *
 * NOTE: unverified on a physical device in this sandbox (see README.md).
 */
class UdpMulticastDiscovery(
  private val appContext: Context,
  private val groupAddress: String,
  private val port: Int,
  private val selfDeviceId: String,
  private val onPeerAnnounced: (JSONObject) -> Unit,
) {
  private var socket: MulticastSocket? = null
  private var multicastLock: WifiManager.MulticastLock? = null
  private val running = AtomicBoolean(false)
  private val executor = Executors.newFixedThreadPool(2)
  private val joinedInterfaces = mutableListOf<NetworkInterface>()

  fun start() {
    if (running.getAndSet(true)) return

    val wifiManager = appContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    multicastLock = wifiManager.createMulticastLock("heishare-discovery").apply {
      setReferenceCounted(true)
      acquire()
    }

    val group = InetAddress.getByName(groupAddress)
    val newSocket = MulticastSocket(port)
    newSocket.reuseAddress = true
    newSocket.timeToLive = 4 // stay on the local segment; not intended to cross routers

    // Join on every usable interface (Wi-Fi, sometimes Ethernet on TVs/tablets)
    // rather than assuming a single default route — multi-homed devices
    // (e.g. Wi-Fi + hotspot) would otherwise miss announcements.
    NetworkInterface.getNetworkInterfaces()?.toList()?.forEach { iface ->
      try {
        if (iface.isUp && iface.supportsMulticast() && !iface.isLoopback) {
          newSocket.joinGroup(InetSocketAddress(group, port), iface)
          joinedInterfaces.add(iface)
        }
      } catch (e: Exception) {
        Log.w(TAG, "Could not join multicast group on ${iface.name}: ${e.message}")
      }
    }

    socket = newSocket
    executor.execute { receiveLoop(newSocket, group) }
  }

  fun stop() {
    if (!running.getAndSet(false)) return
    val currentSocket = socket
    val group = InetAddress.getByName(groupAddress)
    joinedInterfaces.forEach {
      try {
        currentSocket?.leaveGroup(InetSocketAddress(group, port), it)
      } catch (_: Exception) {
      }
    }
    joinedInterfaces.clear()
    currentSocket?.close()
    socket = null
    multicastLock?.let { if (it.isHeld) it.release() }
    multicastLock = null
  }

  /** One-shot send — used for periodic re-announce and the "leaving" notice. */
  fun sendAnnouncement(payload: JSONObject) {
    val currentSocket = socket ?: return
    val bytes = payload.toString().toByteArray(Charsets.UTF_8)
    if (bytes.size > MAX_PACKET_BYTES) {
      Log.w(TAG, "Discovery payload too large (${bytes.size}B) — dropped, see LIMITS.maxDiscoveryPacketBytes")
      return
    }
    executor.execute {
      try {
        val group = InetAddress.getByName(groupAddress)
        currentSocket.send(DatagramPacket(bytes, bytes.size, group, port))
      } catch (e: Exception) {
        Log.w(TAG, "Failed to send discovery announcement: ${e.message}")
      }
    }
  }

  private fun receiveLoop(socket: MulticastSocket, @Suppress("UNUSED_PARAMETER") group: InetAddress) {
    val buffer = ByteArray(MAX_PACKET_BYTES)
    while (running.get()) {
      try {
        val packet = DatagramPacket(buffer, buffer.size)
        socket.receive(packet)
        val text = String(packet.data, 0, packet.length, Charsets.UTF_8)
        val json = JSONObject(text)
        if (json.optString("deviceId") == selfDeviceId) continue // ignore our own announcements
        json.put("host", packet.address.hostAddress) // source IP isn't in the payload itself
        onPeerAnnounced(json)
      } catch (e: Exception) {
        if (running.get()) Log.w(TAG, "Discovery receive error: ${e.message}")
      }
    }
  }

  companion object {
    private const val TAG = "heishare/Discovery"
    private const val MAX_PACKET_BYTES = 2048 // mirrors LIMITS.maxDiscoveryPacketBytes in lib/protocol/constants.ts
  }
}
