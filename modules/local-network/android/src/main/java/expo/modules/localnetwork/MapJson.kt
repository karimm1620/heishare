package expo.modules.localnetwork

import org.json.JSONArray
import org.json.JSONObject

/**
 * The Expo Modules Kotlin bridge deserializes JS objects/arrays into plain
 * Map<String, Any?> / List<Any?>. Converting once here lets the rest of
 * this module (TransferManager, HttpsServer) work entirely in terms of
 * org.json, which is also what's used for wire parsing — one JSON
 * representation throughout native code instead of two.
 */
fun Map<*, *>.toJSONObject(): JSONObject {
  val json = JSONObject()
  for ((key, value) in this) {
    json.put(key.toString(), convertValue(value))
  }
  return json
}

fun List<*>.toJSONArray(): JSONArray {
  val array = JSONArray()
  for (value in this) {
    array.put(convertValue(value))
  }
  return array
}

private fun convertValue(value: Any?): Any =
  when (value) {
    null -> JSONObject.NULL
    is Map<*, *> -> value.toJSONObject()
    is List<*> -> value.toJSONArray()
    else -> value
  }

/** Reverse direction — used when handing a JSONObject payload to
 *  Module.sendEvent(), which expects Map<String, Any?>/primitives rather
 *  than org.json types. */
fun JSONObject.toMap(): Map<String, Any?> {
  val map = mutableMapOf<String, Any?>()
  keys().forEach { key -> map[key] = convertJsonValue(get(key)) }
  return map
}

fun JSONArray.toList(): List<Any?> = (0 until length()).map { convertJsonValue(get(it)) }

private fun convertJsonValue(value: Any?): Any? =
  when {
    value == null || value == JSONObject.NULL -> null
    value is JSONObject -> value.toMap()
    value is JSONArray -> value.toList()
    else -> value
  }
