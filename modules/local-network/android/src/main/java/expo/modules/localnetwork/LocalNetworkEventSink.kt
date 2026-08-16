package expo.modules.localnetwork

import org.json.JSONObject

/**
 * Everything TransferManager/HttpsServer/UdpMulticastDiscovery need to push
 * to JS, expressed as plain JSON payloads matching
 * modules/local-network/src/LocalNetwork.types.ts. Implemented by
 * LocalNetworkModule, which is the only class that touches Expo Modules'
 * `sendEvent` — keeps the socket/streaming code testable independent of the
 * Expo runtime.
 */
interface LocalNetworkEventSink {
  fun onDeviceDiscovered(payload: JSONObject)
  fun onDeviceLost(deviceId: String)
  fun onIncomingTransferRequest(payload: JSONObject)
  fun onTransferDecision(transferId: String, accepted: Boolean)
  fun onTransferProgress(payload: JSONObject)
  fun onServerError(category: String, message: String)
}
