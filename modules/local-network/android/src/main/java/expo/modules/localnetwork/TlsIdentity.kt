package expo.modules.localnetwork

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.cert.Certificate
import java.security.cert.X509Certificate
import java.util.Date
import javax.security.auth.x500.X500Principal

/**
 * Generates and owns this device's local TLS identity — see
 * 03-security-and-transfer-protocol.md §4.
 *
 * Deliberately uses AndroidKeyStore's built-in self-signed certificate
 * generation (KeyGenParameterSpec.setCertificateSubject/...) instead of a
 * BouncyCastle-style X509v3CertificateBuilder: the private key never leaves
 * hardware-backed storage, and it avoids a large crypto dependency that
 * would work against the 50 MB budget (06-performance-and-size.md §1).
 *
 * NOTE (unverified in this sandbox — no Gradle/Keystore access here): the
 * exact KeyGenParameterSpec surface differs slightly across API levels.
 * This targets API 24+ (project minSdk) using the widely-supported
 * subset (setCertificateSubject/NotBefore/NotAfter/SerialNumber). Confirm
 * against a real device via `eas build` before shipping — see README.md.
 */
class TlsIdentity(private val alias: String = "heishare-local-identity") {

  private val androidKeyStore: KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

  /** Generates the key/cert pair once; subsequent calls are a no-op. */
  fun ensureGenerated() {
    if (androidKeyStore.containsAlias(alias)) return

    val subject = X500Principal("CN=heishare, O=heishare-local")
    val now = Date()
    val notAfter = Date(now.time + TEN_YEARS_MS)

    val spec = KeyGenParameterSpec.Builder(
      alias,
      KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
    )
      .setDigests(KeyProperties.DIGEST_SHA256)
      .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
      .setKeySize(2048)
      .setCertificateSubject(subject)
      .setCertificateSerialNumber(BigInteger.valueOf(now.time))
      .setCertificateNotBefore(now)
      .setCertificateNotAfter(notAfter)
      .build()

    val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore")
    generator.initialize(spec)
    generator.generateKeyPair() // self-signed cert is created as a side effect, stored under `alias`
  }

  fun certificate(): X509Certificate {
    ensureGenerated()
    return androidKeyStore.getCertificate(alias) as X509Certificate
  }

  fun certificateChain(): Array<Certificate> {
    ensureGenerated()
    return androidKeyStore.getCertificateChain(alias)
  }

  /** SHA-256 fingerprint of the DER-encoded certificate, lowercase hex with ':' separators. */
  fun fingerprint(): String {
    val der = certificate().encoded
    val digest = MessageDigest.getInstance("SHA-256").digest(der)
    return digest.joinToString(":") { "%02x".format(it) }
  }

  /** Deletes and regenerates the identity — used by Settings > "Reset local identity". */
  fun regenerate() {
    if (androidKeyStore.containsAlias(alias)) androidKeyStore.deleteEntry(alias)
    ensureGenerated()
  }

  companion object {
    private const val TEN_YEARS_MS = 10L * 365 * 24 * 60 * 60 * 1000
  }
}
