package expo.modules.localnetwork

import java.io.File

/**
 * Native-side mirror of src/lib/security/filename.ts. Kept deliberately in
 * sync with the same rules — see 03-security-and-transfer-protocol.md §6.
 * This copy is the one that actually matters: it runs where bytes are
 * written to disk. The TS copy exists so the same policy is unit-testable
 * without touching the filesystem and so client-side UI can preview the
 * name before sending.
 */
object FileSafety {
  private val CONTROL_CHARS = Regex("[\\x00-\\x1f\\x7f]")
  private const val MAX_NAME_LENGTH = 200
  private val WINDOWS_RESERVED_NAMES = setOf(
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
  )

  fun sanitize(rawName: String): String {
    // Strip any directory component outright — a sender-provided path is
    // never trusted, full stop. Only the base name (post path-separator
    // split) is ever considered. Deliberately simpler than trying to
    // pattern-match and strip ".."/traversal sequences: an earlier version
    // of the TS mirror (lib/security/filename.ts) did that and had an edge
    // case with nested segments sharing boundary slashes (e.g. "../../..")
    // — taking only the last segment avoids the whole class of bug.
    var name = rawName.substringAfterLast('/').substringAfterLast('\\')
    name = CONTROL_CHARS.replace(name, "")
    name = name.replace(Regex("[:*?\"<>|]"), "_")
    name = name.trim().trimStart('.').trim()

    if (name.isEmpty()) name = "file"

    val dot = name.lastIndexOf('.')
    val base = if (dot > 0) name.substring(0, dot) else name
    val ext = if (dot > 0) name.substring(dot) else ""

    if (base.uppercase() in WINDOWS_RESERVED_NAMES) {
      name = "_$name"
    }
    if (name.length > MAX_NAME_LENGTH) {
      val keepExt = if (ext.length <= 20) ext else ""
      name = name.take(MAX_NAME_LENGTH - keepExt.length) + keepExt
    }
    return name
  }

  /** `name.ext`, `name (1).ext`, `name (2).ext`, ... */
  fun resolveCollision(sanitizedName: String, destinationDir: File): String {
    var candidate = sanitizedName
    if (!File(destinationDir, candidate).exists()) return candidate

    val dot = sanitizedName.lastIndexOf('.')
    val base = if (dot > 0) sanitizedName.substring(0, dot) else sanitizedName
    val ext = if (dot > 0) sanitizedName.substring(dot) else ""

    var attempt = 1
    candidate = "$base ($attempt)$ext"
    while (File(destinationDir, candidate).exists()) {
      attempt += 1
      candidate = "$base ($attempt)$ext"
    }
    return candidate
  }

  /** Defense in depth against a resolved path escaping the destination
   *  directory (e.g. via a sanitize-rule gap) — belt-and-suspenders on top
   *  of sanitize() rather than a replacement for it. */
  fun isWithinDirectory(file: File, directory: File): Boolean {
    val normalizedFile = file.canonicalFile
    val normalizedDir = directory.canonicalFile
    return normalizedFile.path.startsWith(normalizedDir.path + File.separator)
  }
}
