package expo.modules.localnetwork

import android.util.Log
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.IOException
import java.net.SocketTimeoutException
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLServerSocket

/**
 * Accepts TLS connections and routes each request to TransferManager.
 * Thread-per-connection, bounded by a cached thread pool — appropriate for
 * a local-network utility server handling a handful of peers, not internet
 * scale. See 02-networking-architecture.md §2 (Layer D) and §5 (endpoints).
 *
 * NOTE: unverified in this sandbox — no device/emulator to run this
 * against. See README.md "Native module status."
 */
class HttpsServer(
  private val transferManager: TransferManager,
  private val eventSink: LocalNetworkEventSink,
) {
  private var serverSocket: SSLServerSocket? = null
  private val running = AtomicBoolean(false)
  private val connectionExecutor = Executors.newCachedThreadPool()
  private var acceptThread: Thread? = null

  var boundPort: Int = 0
    private set

  fun start(sslContext: SSLContext, preferredPort: Int) {
    if (running.getAndSet(true)) return

    val socket = try {
      SslContextFactory.createServerSocket(sslContext, preferredPort)
    } catch (e: IOException) {
      // Port in use — fall back to an ephemeral port rather than failing
      // outright. See 01-product-requirements.md "Configurable local
      // listening port, while retaining 53317 as the default."
      Log.w(TAG, "Port $preferredPort unavailable (${e.message}), falling back to an ephemeral port")
      SslContextFactory.createServerSocket(sslContext, 0)
    }
    serverSocket = socket
    boundPort = socket.localPort

    acceptThread = Thread {
      while (running.get()) {
        try {
          val client = socket.accept()
          connectionExecutor.execute { handleConnection(client as javax.net.ssl.SSLSocket) }
        } catch (e: Exception) {
          if (running.get()) {
            eventSink.onServerError("network", e.message ?: "Server accept loop failed")
          }
        }
      }
    }.apply { name = "heishare-https-accept"; start() }
  }

  fun stop() {
    if (!running.getAndSet(false)) return
    try {
      serverSocket?.close()
    } catch (_: Exception) {
    }
    serverSocket = null
    acceptThread?.interrupt()
    acceptThread = null
  }

  private fun handleConnection(client: javax.net.ssl.SSLSocket) {
    client.use { socket ->
      try {
        socket.soTimeout = CONNECTION_IDLE_TIMEOUT_MS
        val input = BufferedInputStream(socket.inputStream)
        val output = socket.outputStream
        val head = MiniHttp.readRequestHead(input)

        when {
          head.method == "POST" && head.path == TransferManager.ENDPOINT_PREPARE_UPLOAD -> {
            val body = readJsonBody(input, head.headers)
            val response = transferManager.handlePrepareUpload(body)
            writeJsonResponse(output, 200, response)
          }
          head.method == "POST" && head.path == TransferManager.ENDPOINT_TEXT -> {
            val body = readJsonBody(input, head.headers)
            val response = transferManager.handleText(body)
            writeJsonResponse(output, 200, response)
          }
          head.method == "POST" && head.path == TransferManager.ENDPOINT_UPLOAD -> {
            val transferId = head.headers["x-transfer-id"]
            val fileId = head.headers["x-file-id"]
            val contentLength = head.headers["content-length"]?.toLongOrNull()
            val expectedSha256 = head.headers["x-sha256"]
            if (transferId == null || fileId == null || contentLength == null) {
              writeJsonResponse(output, 400, JSONObject().put("error", "missing_headers"))
            } else {
              val response = transferManager.handleUploadStream(transferId, fileId, contentLength, expectedSha256, input)
              writeJsonResponse(output, if (response.optBoolean("verified", true)) 200 else 422, response)
            }
          }
          head.method == "POST" && head.path == TransferManager.ENDPOINT_CANCEL -> {
            val body = readJsonBody(input, head.headers)
            writeJsonResponse(output, 200, transferManager.handleCancelRequest(body))
          }
          head.method == "GET" && head.path == TransferManager.ENDPOINT_INFO -> {
            writeJsonResponse(output, 200, transferManager.handleInfo())
          }
          else -> writeJsonResponse(output, 404, JSONObject().put("error", "not_found"))
        }
      } catch (e: SocketTimeoutException) {
        // Idle connection — drop silently, this is routine.
      } catch (e: MiniHttp.MalformedRequestException) {
        Log.w(TAG, "Malformed request: ${e.message}")
      } catch (e: Exception) {
        eventSink.onServerError("unknown", e.message ?: "Connection handling failed")
      }
    }
  }

  private fun readJsonBody(input: BufferedInputStream, headers: Map<String, String>): JSONObject {
    val length = headers["content-length"]?.toIntOrNull() ?: 0
    if (length <= 0 || length > MAX_METADATA_BODY_BYTES) {
      throw MiniHttp.MalformedRequestException("Body missing or exceeds the metadata size limit")
    }
    val bytes = MiniHttp.readExactly(input, length)
    return JSONObject(String(bytes, Charsets.UTF_8))
  }

  private fun writeJsonResponse(output: java.io.OutputStream, status: Int, body: JSONObject) {
    val bytes = body.toString().toByteArray(Charsets.UTF_8)
    val statusText = if (status in 200..299) "OK" else "Error"
    MiniHttp.writeResponseHead(output, status, statusText, mapOf("Content-Type" to "application/json", "Content-Length" to bytes.size.toString()))
    output.write(bytes)
    output.flush()
  }

  companion object {
    private const val TAG = "heishare/HttpsServer"
    private const val CONNECTION_IDLE_TIMEOUT_MS = 30_000 // LIMITS.connectionIdleTimeoutMs
    private const val MAX_METADATA_BODY_BYTES = 64 * 1024 // LIMITS.maxMetadataBodyBytes
  }
}
