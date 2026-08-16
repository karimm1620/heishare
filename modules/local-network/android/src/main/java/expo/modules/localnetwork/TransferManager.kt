package expo.modules.localnetwork

import android.content.Context
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.security.MessageDigest
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

data class OutgoingFileSpec(val fileId: String, val uri: String, val name: String, val size: Long, val mimeType: String?)

data class OutgoingTransferState(
  val transferId: String,
  val peerHost: String,
  val peerPort: Int,
  val peerFingerprint: String,
  val files: List<OutgoingFileSpec>,
  val canceled: AtomicBoolean = AtomicBoolean(false),
)

data class IncomingFileSpec(val fileId: String, val name: String, val safeName: String, val size: Long, val mimeType: String?)

data class IncomingPreparation(
  val transferId: String,
  val senderDeviceId: String,
  val senderAlias: String,
  val senderFingerprint: String,
  val files: List<IncomingFileSpec>,
  val totalBytes: Long,
  val expiresAt: Long,
  val decision: CompletableFuture<Boolean> = CompletableFuture(),
  val canceled: AtomicBoolean = AtomicBoolean(false),
)

/**
 * Owns transfer state and does the actual streaming/digesting/committing —
 * see 02-networking-architecture.md §7 (pipeline) and
 * 03-security-and-transfer-protocol.md §6-7 (file safety, integrity).
 *
 * Deliberately "dumb" about protocol/business decisions per
 * 08-master-ai-prompt.md ("native code must not contain business/UI
 * decisions") EXCEPT for the parts that can only safely happen natively:
 * bounds/size validation before allocating anything, filename
 * sanitization, and the actual accept/reject gate is still a JS/user
 * decision relayed in via respondToTransfer().
 *
 * NOTE: unverified in this sandbox — no device/emulator to run this
 * against. See README.md "Native module status."
 */
class TransferManager(
  private val appContext: Context,
  private val eventSink: LocalNetworkEventSink,
) {
  var selfDeviceId: String = ""
  var selfAlias: String = ""
  var selfFingerprint: String = ""

  private val destinationDir: File by lazy {
    File(appContext.getExternalFilesDir(null), "heishare/received").apply { mkdirs() }
  }
  private val tempDir: File by lazy {
    File(appContext.cacheDir, "heishare/tmp").apply { mkdirs() }
  }

  private val pendingIncoming = ConcurrentHashMap<String, IncomingPreparation>()
  private val acceptedIncoming = ConcurrentHashMap<String, IncomingPreparation>()
  private val outgoingTransfers = ConcurrentHashMap<String, OutgoingTransferState>()

  /** Bounds simultaneous streaming operations — LIMITS.maxSimultaneousUploads. */
  private val uploadSlots = Semaphore(MAX_SIMULTANEOUS_UPLOADS)
  private val executor = Executors.newCachedThreadPool()
  private val lastProgressEmitMs = ConcurrentHashMap<String, Long>()

  fun shutdown() {
    executor.shutdownNow()
    pendingIncoming.values.forEach { it.decision.complete(false) }
    pendingIncoming.clear()
    acceptedIncoming.clear()
    outgoingTransfers.clear()
  }

  // =========================================================================
  // Server-side (this device is the receiver)
  // =========================================================================

  /** Blocks the calling (server-connection) thread until the user responds
   *  or the request expires — see 03-security §9 replay/expiration and
   *  02-networking §7 step 5 ("Await receiver decision"). */
  fun handlePrepareUpload(body: JSONObject): JSONObject {
    val transferId = body.getString("transferId")

    if (pendingIncoming.size >= MAX_PENDING_INCOMING) {
      return JSONObject().put("transferId", transferId).put("accepted", false)
    }

    val filesJson = body.getJSONArray("files")
    val files = (0 until filesJson.length()).map { i ->
      val f = filesJson.getJSONObject(i)
      val rawName = f.getString("name")
      IncomingFileSpec(
        fileId = f.getString("fileId"),
        name = rawName,
        safeName = FileSafety.sanitize(rawName),
        size = f.getLong("size"),
        mimeType = f.optString("mimeType", null),
      )
    }
    val expiresAt = body.optLong("expiresAt", System.currentTimeMillis() + DEFAULT_TTL_MS)

    val prep = IncomingPreparation(
      transferId = transferId,
      senderDeviceId = body.optString("senderDeviceId", ""),
      senderAlias = body.getString("senderAlias"),
      senderFingerprint = body.getString("senderFingerprint"),
      files = files,
      totalBytes = body.optLong("totalBytes", files.sumOf { it.size }),
      expiresAt = expiresAt,
    )
    pendingIncoming[transferId] = prep

    eventSink.onIncomingTransferRequest(
      JSONObject()
        .put("transferId", transferId)
        .put("senderDeviceId", prep.senderDeviceId)
        .put("senderAlias", prep.senderAlias)
        .put("senderFingerprint", prep.senderFingerprint)
        .put(
          "files",
          JSONArray(
            files.map { f ->
              JSONObject().put("fileId", f.fileId).put("name", f.name).put("size", f.size)
                .put("mimeType", f.mimeType ?: JSONObject.NULL)
            },
          ),
        )
        .put("totalBytes", prep.totalBytes)
        .put("textPreview", JSONObject.NULL)
        .put("expiresAt", expiresAt),
    )

    val waitMs = (expiresAt - System.currentTimeMillis()).coerceIn(0, DEFAULT_TTL_MS)
    val accepted = try {
      prep.decision.get(waitMs, TimeUnit.MILLISECONDS)
    } catch (e: Exception) {
      false
    } finally {
      pendingIncoming.remove(transferId)
    }
    if (accepted) acceptedIncoming[transferId] = prep

    return JSONObject().put("transferId", transferId).put("accepted", accepted)
  }

  /** Text is delivered inline in the request — no separate upload step. */
  fun handleText(body: JSONObject): JSONObject {
    val transferId = body.getString("transferId")
    val text = body.getString("text")

    val prep = IncomingPreparation(
      transferId = transferId,
      senderDeviceId = body.optString("senderDeviceId", ""),
      senderAlias = body.getString("senderAlias"),
      senderFingerprint = body.getString("senderFingerprint"),
      files = emptyList(),
      totalBytes = text.toByteArray(Charsets.UTF_8).size.toLong(),
      expiresAt = System.currentTimeMillis() + DEFAULT_TTL_MS,
    )
    pendingIncoming[transferId] = prep

    eventSink.onIncomingTransferRequest(
      JSONObject()
        .put("transferId", transferId)
        .put("senderDeviceId", prep.senderDeviceId)
        .put("senderAlias", prep.senderAlias)
        .put("senderFingerprint", prep.senderFingerprint)
        .put("files", JSONArray())
        .put("totalBytes", prep.totalBytes)
        .put("textPreview", text.take(512))
        .put("expiresAt", prep.expiresAt),
    )

    val waitMs = (prep.expiresAt - System.currentTimeMillis()).coerceIn(0, DEFAULT_TTL_MS)
    val accepted = try {
      prep.decision.get(waitMs, TimeUnit.MILLISECONDS)
    } catch (e: Exception) {
      false
    } finally {
      pendingIncoming.remove(transferId)
    }

    if (accepted) {
      emitProgress(transferId, null, prep.totalBytes, prep.totalBytes, "completed", null, null)
    }
    return JSONObject().put("transferId", transferId).put("accepted", accepted)
  }

  /** Streams exactly `contentLength` bytes from `input` into a temp file,
   *  verifying against `expectedSha256` before the atomic commit. */
  fun handleUploadStream(
    transferId: String,
    fileId: String,
    contentLength: Long,
    expectedSha256: String?,
    input: InputStream,
  ): JSONObject {
    val prep = acceptedIncoming[transferId]
      ?: return JSONObject().put("error", "unknown_or_unaccepted_transfer")
    val fileSpec = prep.files.find { it.fileId == fileId }
      ?: return JSONObject().put("error", "unknown_file")

    if (!uploadSlots.tryAcquire()) {
      return JSONObject().put("error", "too_many_concurrent_uploads")
    }

    val alreadyCompletedBytes = prep.files.takeWhile { it.fileId != fileId }.sumOf { it.size }
    val tempFile = File(tempDir, "$transferId-$fileId.part")
    val digest = MessageDigest.getInstance("SHA-256")

    try {
      tempFile.outputStream().use { out ->
        val buffer = ByteArray(STREAM_BUFFER_BYTES)
        var received = 0L
        while (received < contentLength) {
          if (prep.canceled.get()) throw IOException("canceled")
          val toRead = minOf(buffer.size.toLong(), contentLength - received).toInt()
          val read = input.read(buffer, 0, toRead)
          if (read == -1) throw IOException("Connection closed before all bytes were received")
          out.write(buffer, 0, read)
          digest.update(buffer, 0, read)
          received += read
          maybeEmitProgress(transferId, fileId, alreadyCompletedBytes + received, prep.totalBytes, "transferring")
        }
      }
    } catch (e: Exception) {
      tempFile.delete()
      uploadSlots.release()
      emitProgress(transferId, fileId, alreadyCompletedBytes, prep.totalBytes, "failed", "network", e.message)
      return JSONObject().put("error", "stream_failed")
    }

    val actualDigest = digest.digest().joinToString("") { "%02x".format(it) }
    if (expectedSha256 != null && !expectedSha256.equals(actualDigest, ignoreCase = true)) {
      tempFile.delete()
      uploadSlots.release()
      emitProgress(transferId, fileId, alreadyCompletedBytes, prep.totalBytes, "failed", "integrity", "Checksum mismatch")
      return JSONObject().put("verified", false)
    }

    emitProgress(transferId, fileId, alreadyCompletedBytes + fileSpec.size, prep.totalBytes, "verifying")

    val finalName = FileSafety.resolveCollision(fileSpec.safeName, destinationDir)
    val finalFile = File(destinationDir, finalName)
    val committed = if (FileSafety.isWithinDirectory(finalFile, destinationDir)) {
      tempFile.renameTo(finalFile) || run {
        // Cross-filesystem fallback (temp dir and destination dir can be on
        // different mount points on some devices) — copy then delete.
        tempFile.copyTo(finalFile, overwrite = false)
        tempFile.delete()
        true
      }
    } else {
      false
    }
    uploadSlots.release()

    if (!committed) {
      tempFile.delete()
      emitProgress(transferId, fileId, alreadyCompletedBytes, prep.totalBytes, "failed", "storage", "Could not save the file")
      return JSONObject().put("verified", false)
    }

    val isLastFile = prep.files.lastOrNull()?.fileId == fileId
    if (isLastFile) {
      acceptedIncoming.remove(transferId)
      emitProgress(transferId, fileId, prep.totalBytes, prep.totalBytes, "completed")
    }

    return JSONObject().put("transferId", transferId).put("fileId", fileId).put("verified", true)
  }

  fun handleCancelRequest(body: JSONObject): JSONObject {
    val transferId = body.getString("transferId")
    pendingIncoming[transferId]?.let {
      it.canceled.set(true)
      it.decision.complete(false)
    }
    acceptedIncoming[transferId]?.canceled?.set(true)
    outgoingTransfers[transferId]?.canceled?.set(true)
    emitProgress(transferId, null, 0, 0, "canceled")
    return JSONObject().put("transferId", transferId).put("ok", true)
  }

  fun handleInfo(): JSONObject =
    JSONObject()
      .put("alias", selfAlias)
      .put("deviceType", "mobile")
      .put("protocolVersion", PROTOCOL_VERSION)
      .put("fingerprint", selfFingerprint)
      .put("uptimeMs", System.currentTimeMillis() - startedAtMs)

  // =========================================================================
  // Client-side (this device is the sender)
  // =========================================================================

  fun prepareUpload(request: JSONObject) {
    val transferId = request.getString("transferId")
    val peerHost = request.getString("peerHost")
    val peerPort = request.getInt("peerPort")
    val peerFingerprint = request.getString("peerFingerprint")
    val filesJson = request.getJSONArray("files")

    val files = (0 until filesJson.length()).map { i ->
      val f = filesJson.getJSONObject(i)
      OutgoingFileSpec(f.getString("fileId"), f.getString("uri"), f.getString("name"), f.getLong("size"), f.optString("mimeType", null))
    }
    outgoingTransfers[transferId] = OutgoingTransferState(transferId, peerHost, peerPort, peerFingerprint, files)

    executor.execute {
      try {
        val socketFactory = PinnedTrustManager.buildSocketFactory(peerFingerprint)
        socketFactory.createSocket(peerHost, peerPort).use { socket ->
          socket.soTimeout = DEFAULT_TTL_MS.toInt() + 5_000
          val bodyJson = JSONObject()
            .put("transferId", transferId)
            .put("senderDeviceId", selfDeviceId)
            .put("senderAlias", selfAlias)
            .put("senderFingerprint", selfFingerprint)
            .put("protocolVersion", PROTOCOL_VERSION)
            .put("files", JSONArray(files.map { f -> JSONObject().put("fileId", f.fileId).put("name", f.name).put("size", f.size).put("mimeType", f.mimeType ?: JSONObject.NULL) }))
            .put("totalBytes", files.sumOf { it.size })
            .put("textPreview", JSONObject.NULL)
            .put("expiresAt", System.currentTimeMillis() + DEFAULT_TTL_MS)
          val bodyBytes = bodyJson.toString().toByteArray(Charsets.UTF_8)

          val output = socket.outputStream
          MiniHttp.writeRequestHead(output, "POST", ENDPOINT_PREPARE_UPLOAD, peerHost, mapOf("Content-Type" to "application/json", "Content-Length" to bodyBytes.size.toString()))
          output.write(bodyBytes)
          output.flush()

          val input = BufferedInputStream(socket.inputStream)
          val head = MiniHttp.readResponseHead(input)
          val contentLength = head.headers["content-length"]?.toIntOrNull() ?: 0
          val responseBody = if (contentLength > 0) String(MiniHttp.readExactly(input, contentLength), Charsets.UTF_8) else "{}"
          val accepted = JSONObject(responseBody).optBoolean("accepted", false)
          eventSink.onTransferDecision(transferId, accepted)
        }
      } catch (e: Exception) {
        eventSink.onTransferProgress(
          progressPayload(transferId, null, 0, files.sumOf { it.size }, "failed", "network", e.message),
        )
      }
    }
  }

  fun startUpload(transferId: String) {
    val outgoing = outgoingTransfers[transferId] ?: return
    executor.execute {
      var sentBytes = 0L
      val totalBytes = outgoing.files.sumOf { it.size }
      try {
        for (file in outgoing.files) {
          if (outgoing.canceled.get()) {
            emitProgress(transferId, null, sentBytes, totalBytes, "canceled")
            return@execute
          }
          sentBytes = uploadOneFile(outgoing, file, sentBytes, totalBytes)
        }
        outgoingTransfers.remove(transferId)
      } catch (e: Exception) {
        emitProgress(transferId, null, sentBytes, totalBytes, "failed", "network", e.message)
      }
    }
  }

  private fun uploadOneFile(outgoing: OutgoingTransferState, file: OutgoingFileSpec, sentBytesSoFar: Long, totalBytes: Long): Long {
    val digest = MessageDigest.getInstance("SHA-256")
    resolveInputStream(file.uri).use { probe ->
      val buffer = ByteArray(STREAM_BUFFER_BYTES)
      while (true) {
        val read = probe.read(buffer)
        if (read == -1) break
        digest.update(buffer, 0, read)
      }
    }
    val sha256 = digest.digest().joinToString("") { "%02x".format(it) }

    val socketFactory = PinnedTrustManager.buildSocketFactory(outgoing.peerFingerprint)
    var sent = sentBytesSoFar
    socketFactory.createSocket(outgoing.peerHost, outgoing.peerPort).use { socket ->
      socket.soTimeout = UPLOAD_SOCKET_TIMEOUT_MS
      val output = socket.outputStream
      MiniHttp.writeRequestHead(
        output,
        "POST",
        ENDPOINT_UPLOAD,
        outgoing.peerHost,
        mapOf(
          "Content-Type" to "application/octet-stream",
          "Content-Length" to file.size.toString(),
          "X-Transfer-Id" to outgoing.transferId,
          "X-File-Id" to file.fileId,
          "X-Sha256" to sha256,
        ),
      )
      resolveInputStream(file.uri).use { input ->
        val buffer = ByteArray(STREAM_BUFFER_BYTES)
        while (true) {
          if (outgoing.canceled.get()) throw IOException("canceled")
          val read = input.read(buffer)
          if (read == -1) break
          output.write(buffer, 0, read)
          sent += read
          maybeEmitProgress(outgoing.transferId, file.fileId, sent, totalBytes, "transferring")
        }
      }
      output.flush()

      val bufferedInput = BufferedInputStream(socket.inputStream)
      val head = MiniHttp.readResponseHead(bufferedInput)
      val contentLength = head.headers["content-length"]?.toIntOrNull() ?: 0
      val responseBody = if (contentLength > 0) String(MiniHttp.readExactly(bufferedInput, contentLength), Charsets.UTF_8) else "{}"
      val verified = JSONObject(responseBody).optBoolean("verified", false)
      if (!verified) throw IOException("Receiver could not verify the file")
    }

    val isLast = outgoing.files.lastOrNull()?.fileId == file.fileId
    emitProgress(outgoing.transferId, file.fileId, sent, totalBytes, if (isLast) "completed" else "transferring")
    return sent
  }

  private fun resolveInputStream(uri: String): InputStream =
    if (uri.startsWith("content://")) {
      appContext.contentResolver.openInputStream(Uri.parse(uri)) ?: throw IOException("Could not open $uri")
    } else {
      File(Uri.parse(uri).path ?: uri).inputStream()
    }

  fun sendText(request: JSONObject) {
    val transferId = request.getString("transferId")
    val peerHost = request.getString("peerHost")
    val peerPort = request.getInt("peerPort")
    val peerFingerprint = request.getString("peerFingerprint")
    val text = request.getString("text")

    executor.execute {
      try {
        val socketFactory = PinnedTrustManager.buildSocketFactory(peerFingerprint)
        socketFactory.createSocket(peerHost, peerPort).use { socket ->
          socket.soTimeout = DEFAULT_TTL_MS.toInt() + 5_000
          val bodyJson = JSONObject()
            .put("transferId", transferId)
            .put("senderDeviceId", selfDeviceId)
            .put("senderAlias", selfAlias)
            .put("senderFingerprint", selfFingerprint)
            .put("text", text)
            .put("createdAt", System.currentTimeMillis())
          val bodyBytes = bodyJson.toString().toByteArray(Charsets.UTF_8)

          val output = socket.outputStream
          MiniHttp.writeRequestHead(output, "POST", ENDPOINT_TEXT, peerHost, mapOf("Content-Type" to "application/json", "Content-Length" to bodyBytes.size.toString()))
          output.write(bodyBytes)
          output.flush()

          val input = BufferedInputStream(socket.inputStream)
          val head = MiniHttp.readResponseHead(input)
          val contentLength = head.headers["content-length"]?.toIntOrNull() ?: 0
          val responseBody = if (contentLength > 0) String(MiniHttp.readExactly(input, contentLength), Charsets.UTF_8) else "{}"
          val accepted = JSONObject(responseBody).optBoolean("accepted", false)
          eventSink.onTransferDecision(transferId, accepted)
        }
      } catch (e: Exception) {
        eventSink.onTransferProgress(progressPayload(transferId, null, 0, text.length.toLong(), "failed", "network", e.message))
      }
    }
  }

  // =========================================================================
  // Shared
  // =========================================================================

  fun respondToTransfer(transferId: String, accept: Boolean) {
    pendingIncoming[transferId]?.decision?.complete(accept)
  }

  fun cancelTransfer(transferId: String) {
    pendingIncoming[transferId]?.let {
      it.canceled.set(true)
      it.decision.complete(false)
    }
    acceptedIncoming[transferId]?.canceled?.set(true)
    outgoingTransfers[transferId]?.canceled?.set(true)
    emitProgress(transferId, null, 0, 0, "canceled")
  }

  private fun maybeEmitProgress(transferId: String, fileId: String?, bytes: Long, total: Long, state: String) {
    val now = System.currentTimeMillis()
    val last = lastProgressEmitMs[transferId] ?: 0L
    if (now - last < PROGRESS_THROTTLE_MS && bytes < total) return
    lastProgressEmitMs[transferId] = now
    emitProgress(transferId, fileId, bytes, total, state)
  }

  private fun emitProgress(
    transferId: String,
    fileId: String?,
    bytes: Long,
    total: Long,
    state: String,
    errorCategory: String? = null,
    errorMessage: String? = null,
  ) {
    eventSink.onTransferProgress(progressPayload(transferId, fileId, bytes, total, state, errorCategory, errorMessage))
  }

  private fun progressPayload(
    transferId: String,
    fileId: String?,
    bytes: Long,
    total: Long,
    state: String,
    errorCategory: String? = null,
    errorMessage: String? = null,
  ): JSONObject =
    JSONObject()
      .put("transferId", transferId)
      .put("fileId", fileId ?: JSONObject.NULL)
      .put("bytesTransferred", bytes)
      .put("totalBytes", total)
      .put("state", state)
      .put("errorCategory", errorCategory ?: JSONObject.NULL)
      .put("errorMessage", errorMessage ?: JSONObject.NULL)

  companion object {
    const val PROTOCOL_VERSION = "1.0"
    const val ENDPOINT_PREPARE_UPLOAD = "/api/heishare/v1/prepare-upload"
    const val ENDPOINT_UPLOAD = "/api/heishare/v1/upload"
    const val ENDPOINT_TEXT = "/api/heishare/v1/text"
    const val ENDPOINT_CANCEL = "/api/heishare/v1/cancel"
    const val ENDPOINT_INFO = "/api/heishare/v1/info"

    private const val MAX_PENDING_INCOMING = 10 // LIMITS.maxPendingIncomingPreparations
    private const val MAX_SIMULTANEOUS_UPLOADS = 3 // LIMITS.maxSimultaneousUploads
    private const val DEFAULT_TTL_MS = 2 * 60 * 1000L // LIMITS.transferPreparationTtlMs
    private const val STREAM_BUFFER_BYTES = 64 * 1024
    private const val PROGRESS_THROTTLE_MS = 80L // ~12Hz, within the 10-20Hz target
    private const val UPLOAD_SOCKET_TIMEOUT_MS = 5 * 60 * 1000
    private val startedAtMs = System.currentTimeMillis()
  }
}
