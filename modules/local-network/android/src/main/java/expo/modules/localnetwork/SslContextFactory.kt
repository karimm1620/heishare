package expo.modules.localnetwork

import java.security.KeyStore
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLServerSocket
import javax.net.ssl.SSLServerSocketFactory

/**
 * Wraps the AndroidKeyStore-backed identity into an SSLContext for the local
 * HTTPS server. Server-only: heishare does not validate the *client's*
 * certificate during the handshake (there isn't a client cert — see
 * 02-networking-architecture.md §6, "client verifies peer identity using the
 * protocol's fingerprint mechanism", which happens at the application layer
 * by comparing PeerDevice.fingerprint to what the JS layer expects, not via
 * mutual TLS).
 */
object SslContextFactory {

  fun build(identity: TlsIdentity): SSLContext {
    identity.ensureGenerated()

    val keyManagerFactory = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
    // "AndroidKeyStore" as the KeyStore type lets KeyManagerFactory pull the
    // private key straight out of hardware-backed storage — the key
    // material itself is never read into this process's heap.
    val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    keyManagerFactory.init(keyStore, null)

    val context = SSLContext.getInstance("TLSv1.3")
    context.init(keyManagerFactory.keyManagers, null, null)
    return context
  }

  fun createServerSocket(context: SSLContext, port: Int): SSLServerSocket {
    val factory = context.serverSocketFactory as SSLServerSocketFactory
    val socket = factory.createServerSocket(port) as SSLServerSocket
    socket.enabledProtocols = arrayOf("TLSv1.3", "TLSv1.2")
    socket.wantClientAuth = false
    socket.needClientAuth = false
    return socket
  }
}
