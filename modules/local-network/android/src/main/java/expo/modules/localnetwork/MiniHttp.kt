package expo.modules.localnetwork

import java.io.BufferedInputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream

/**
 * Minimal HTTP/1.1 message framing — request line + headers + a
 * fixed-length body (Content-Length only; no chunked transfer-encoding).
 * heishare's own endpoints never need chunked encoding since every request
 * either has a known JSON body size or a known file size up front, so a
 * full HTTP stack (and its size/maintenance cost — see
 * 05-project-structure-and-dependencies.md §4) wasn't justified for v1.
 *
 * Used by both HttpsServer (parsing requests) and TransferManager's
 * outbound client calls (writing requests / parsing responses) over the
 * same SSLSocket streams.
 */
object MiniHttp {
  const val CRLF = "\r\n"
  private const val MAX_HEADER_BYTES = 16 * 1024
  private const val MAX_REQUEST_LINE_BYTES = 2 * 1024

  data class RequestHead(val method: String, val path: String, val headers: Map<String, String>)
  data class ResponseHead(val status: Int, val headers: Map<String, String>)

  class MalformedRequestException(message: String) : IOException(message)

  fun readRequestHead(input: BufferedInputStream): RequestHead {
    val requestLine = readLine(input, MAX_REQUEST_LINE_BYTES) ?: throw MalformedRequestException("Empty request")
    val parts = requestLine.split(" ")
    if (parts.size < 2) throw MalformedRequestException("Malformed request line")
    val headers = readHeaders(input)
    return RequestHead(parts[0].uppercase(), parts[1], headers)
  }

  fun readResponseHead(input: BufferedInputStream): ResponseHead {
    val statusLine = readLine(input, MAX_REQUEST_LINE_BYTES) ?: throw MalformedRequestException("Empty response")
    val parts = statusLine.split(" ")
    if (parts.size < 2) throw MalformedRequestException("Malformed status line")
    val status = parts[1].toIntOrNull() ?: throw MalformedRequestException("Malformed status code")
    val headers = readHeaders(input)
    return ResponseHead(status, headers)
  }

  private fun readHeaders(input: BufferedInputStream): Map<String, String> {
    val headers = mutableMapOf<String, String>()
    var totalBytes = 0
    while (true) {
      val line = readLine(input, MAX_HEADER_BYTES - totalBytes) ?: break
      totalBytes += line.length
      if (line.isEmpty()) break
      val idx = line.indexOf(':')
      if (idx <= 0) continue
      headers[line.substring(0, idx).trim().lowercase()] = line.substring(idx + 1).trim()
    }
    return headers
  }

  private fun readLine(input: InputStream, maxBytes: Int): String? {
    val sb = StringBuilder()
    var byteCount = 0
    while (true) {
      val b = input.read()
      if (b == -1) return if (sb.isEmpty()) null else sb.toString()
      byteCount += 1
      if (byteCount > maxBytes) throw MalformedRequestException("Header/request line too long")
      if (b == '\r'.code) continue
      if (b == '\n'.code) return sb.toString()
      sb.append(b.toChar())
    }
  }

  fun writeRequestHead(output: OutputStream, method: String, path: String, host: String, extraHeaders: Map<String, String>) {
    val sb = StringBuilder()
    sb.append("$method $path HTTP/1.1$CRLF")
    sb.append("Host: $host$CRLF")
    sb.append("Connection: close$CRLF")
    extraHeaders.forEach { (k, v) -> sb.append("$k: $v$CRLF") }
    sb.append(CRLF)
    output.write(sb.toString().toByteArray(Charsets.UTF_8))
  }

  fun writeResponseHead(output: OutputStream, status: Int, statusText: String, extraHeaders: Map<String, String>) {
    val sb = StringBuilder()
    sb.append("HTTP/1.1 $status $statusText$CRLF")
    sb.append("Connection: close$CRLF")
    extraHeaders.forEach { (k, v) -> sb.append("$k: $v$CRLF") }
    sb.append(CRLF)
    output.write(sb.toString().toByteArray(Charsets.UTF_8))
  }

  /** Reads exactly `length` bytes — callers must already have validated
   *  `length` against a size limit before calling (see LIMITS in
   *  lib/protocol/constants.ts and its Kotlin mirror in TransferManager). */
  fun readExactly(input: InputStream, length: Int): ByteArray {
    val buffer = ByteArray(length)
    var offset = 0
    while (offset < length) {
      val read = input.read(buffer, offset, length - offset)
      if (read == -1) throw MalformedRequestException("Connection closed before body was fully received")
      offset += read
    }
    return buffer
  }
}
