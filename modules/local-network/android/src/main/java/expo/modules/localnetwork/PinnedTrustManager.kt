package expo.modules.localnetwork

import java.security.MessageDigest
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.X509TrustManager

/**
 * Client-side trust for outgoing connections to a peer: instead of a CA
 * chain (there isn't one — every device's cert is self-signed, see
 * 03-security-and-transfer-protocol.md §4), the presented certificate's
 * SHA-256 fingerprint must exactly match the fingerprint the peer announced
 * during discovery.
 *
 * This is deliberately NOT a trust-all TrustManager — 02-networking-architecture.md §6
 * and 08-master-ai-prompt.md both explicitly prohibit disabling TLS
 * verification globally. A mismatch (peer rotated its identity, or a
 * different device answered on that address) fails the handshake.
 */
class PinnedTrustManager(private val expectedFingerprint: String) : X509TrustManager {

  override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {
    throw CertificateException("heishare's local server does not require client certificates")
  }

  override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {
    val cert = chain?.firstOrNull() ?: throw CertificateException("No certificate presented")
    val digest = MessageDigest.getInstance("SHA-256").digest(cert.encoded)
    val actual = digest.joinToString(":") { "%02x".format(it) }
    val normalizedExpected = expectedFingerprint.lowercase().trim()
    if (actual != normalizedExpected) {
      throw CertificateException(
        "Certificate fingerprint mismatch: expected $normalizedExpected but peer presented $actual. " +
          "This peer's identity may have changed.",
      )
    }
  }

  override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()

  companion object {
    fun buildSocketFactory(expectedFingerprint: String): SSLSocketFactory {
      val context = SSLContext.getInstance("TLSv1.3")
      context.init(null, arrayOf(PinnedTrustManager(expectedFingerprint)), null)
      return context.socketFactory
    }
  }
}
