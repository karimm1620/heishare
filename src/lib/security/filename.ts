/**
 * File safety — see 03-security-and-transfer-protocol.md §6.
 *
 * A sender-provided name is never trusted as a path. This module only ever
 * produces a bare filename with no directory component; the native layer is
 * responsible for joining it to the app's own sandboxed destination
 * directory and for the atomic temp-file → final-destination move.
 */

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;
const WINDOWS_RESERVED_CHARS = /[:*?"<>|]/g;
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

const MAX_NAME_LENGTH = 200;
const FALLBACK_NAME = 'file';

/**
 * Normalizes a sender-provided filename into something safe to write on any
 * supported platform. Never throws — always returns a usable name.
 *
 * Mirrors FileSafety.kt's `sanitize()` exactly: only the last path segment
 * is ever considered (equivalent to `substringAfterLast('/')` twice), which
 * handles absolute paths and ".."-traversal identically and more simply
 * than trying to pattern-match and strip traversal sequences — a regex-based
 * "strip every '..' segment" approach turned out to have an edge case
 * (nested segments sharing boundary slashes, e.g. "../../..") that this
 * avoids entirely by construction.
 */
export function sanitizeFileName(rawName: string): string {
  let name = rawName ?? '';

  const lastSlash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  if (lastSlash >= 0) name = name.slice(lastSlash + 1);

  name = name.replace(CONTROL_CHARS, '');
  name = name.replace(WINDOWS_RESERVED_CHARS, '_');
  name = name.trim().replace(/^\.+/, '').trim();

  if (name.length === 0) {
    name = FALLBACK_NAME;
  }

  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';

  if (WINDOWS_RESERVED_NAMES.has(base.toUpperCase())) {
    name = `_${name}`;
  }

  if (name.length > MAX_NAME_LENGTH) {
    const keepExt = ext.length <= 20 ? ext : '';
    name = name.slice(0, MAX_NAME_LENGTH - keepExt.length) + keepExt;
  }

  return name;
}

/**
 * Deterministic collision policy: `name.ext`, `name (1).ext`, `name (2).ext`, ...
 * `existingNames` should be the sanitized names already present at the
 * destination (case handling is caller's responsibility per platform).
 */
export function resolveCollisionSafeName(sanitizedName: string, existingNames: ReadonlySet<string>): string {
  if (!existingNames.has(sanitizedName)) return sanitizedName;

  const dot = sanitizedName.lastIndexOf('.');
  const base = dot > 0 ? sanitizedName.slice(0, dot) : sanitizedName;
  const ext = dot > 0 ? sanitizedName.slice(dot) : '';

  let attempt = 1;
  let candidate = `${base} (${attempt})${ext}`;
  while (existingNames.has(candidate)) {
    attempt += 1;
    candidate = `${base} (${attempt})${ext}`;
  }
  return candidate;
}
