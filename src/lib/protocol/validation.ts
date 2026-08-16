/**
 * Request validation for every versioned endpoint.
 *
 * Deliberately hand-rolled instead of pulling in a schema-validation
 * dependency (zod, ajv, ...): the shapes are small, stable, and fully
 * covered by tests/protocol/validation.test.ts — a dependency wasn't
 * justified per 05-project-structure-and-dependencies.md §4.
 *
 * Every validator returns a Result instead of throwing, so a malformed
 * request can fail fast without crashing the receiving server —
 * 03-security-and-transfer-protocol.md §8.
 */

import { LIMITS, PROTOCOL_VERSION, TRANSFER_ID_PATTERN, FILE_ID_PATTERN } from './constants';
import type {
  CancelRequestBody,
  PrepareUploadFileEntry,
  PrepareUploadRequestBody,
  RegisterRequestBody,
  TextRequestBody,
} from './schema';

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

function fail<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

const DEVICE_TYPES = new Set(['mobile', 'desktop', 'web', 'unknown']);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Rejects the values path traversal / control-character sanitization also
 *  rejects — kept here too so oversized or malformed bodies never reach the
 *  filename sanitizer at all. Deep validation of the *name* itself is
 *  lib/security/filename.ts's job; this only checks shape/bounds. */
function validateFileEntry(v: unknown): ValidationResult<PrepareUploadFileEntry> {
  if (!isPlainObject(v)) return fail('file entry must be an object');
  if (!isNonEmptyString(v.fileId) || !FILE_ID_PATTERN.test(v.fileId)) {
    return fail('file entry has an invalid fileId');
  }
  if (!isNonEmptyString(v.name) || v.name.length > 1024) {
    return fail('file entry has an invalid name');
  }
  if (!isFiniteNumber(v.size) || v.size < 0) {
    return fail('file entry has an invalid size');
  }
  if (v.mimeType !== null && typeof v.mimeType !== 'string') {
    return fail('file entry has an invalid mimeType');
  }
  return ok({
    fileId: v.fileId,
    name: v.name,
    size: v.size,
    mimeType: (v.mimeType as string | null) ?? null,
  });
}

export function validateRegisterRequest(body: unknown): ValidationResult<RegisterRequestBody> {
  if (!isPlainObject(body)) return fail('body must be a JSON object');
  if (!isNonEmptyString(body.deviceId)) return fail('deviceId is required');
  if (!isNonEmptyString(body.alias) || body.alias.length > 128) return fail('alias is required (max 128 chars)');
  if (!DEVICE_TYPES.has(body.deviceType as string)) return fail('deviceType is invalid');
  if (body.protocolVersion !== PROTOCOL_VERSION) return fail(`unsupported protocolVersion: ${String(body.protocolVersion)}`);
  if (!isFiniteNumber(body.port) || body.port < 1 || body.port > 65535) return fail('port is invalid');
  if (!isNonEmptyString(body.fingerprint)) return fail('fingerprint is required');
  if (!isPlainObject(body.capabilities)) return fail('capabilities is required');

  return ok({
    deviceId: body.deviceId,
    alias: body.alias,
    deviceType: body.deviceType as RegisterRequestBody['deviceType'],
    protocolVersion: body.protocolVersion,
    port: body.port,
    fingerprint: body.fingerprint,
    capabilities: {
      receiveFiles: Boolean((body.capabilities as Record<string, unknown>).receiveFiles),
      receiveText: Boolean((body.capabilities as Record<string, unknown>).receiveText),
      maxConcurrentUploads: Number((body.capabilities as Record<string, unknown>).maxConcurrentUploads) || 1,
    },
  });
}

export function validatePrepareUploadRequest(body: unknown): ValidationResult<PrepareUploadRequestBody> {
  if (!isPlainObject(body)) return fail('body must be a JSON object');
  if (!isNonEmptyString(body.transferId) || !TRANSFER_ID_PATTERN.test(body.transferId)) {
    return fail('transferId is invalid');
  }
  if (!isNonEmptyString(body.senderDeviceId)) return fail('senderDeviceId is required');
  if (!isNonEmptyString(body.senderAlias) || body.senderAlias.length > 128) return fail('senderAlias is invalid');
  if (!isNonEmptyString(body.senderFingerprint)) return fail('senderFingerprint is required');
  if (body.protocolVersion !== PROTOCOL_VERSION) return fail(`unsupported protocolVersion: ${String(body.protocolVersion)}`);
  if (!Array.isArray(body.files) || body.files.length === 0) return fail('files must be a non-empty array');
  if (body.files.length > LIMITS.maxFilesPerTransfer) return fail(`too many files (max ${LIMITS.maxFilesPerTransfer})`);

  const files: PrepareUploadFileEntry[] = [];
  for (const entry of body.files) {
    const result = validateFileEntry(entry);
    if (!result.ok) return fail(result.error);
    files.push(result.value);
  }

  if (!isFiniteNumber(body.totalBytes) || body.totalBytes < 0) return fail('totalBytes is invalid');
  const sumBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (sumBytes !== body.totalBytes) return fail('totalBytes does not match the sum of file sizes');

  if (body.textPreview !== null && body.textPreview !== undefined) {
    if (typeof body.textPreview !== 'string' || body.textPreview.length > 512) {
      return fail('textPreview is invalid (max 512 chars)');
    }
  }
  if (!isFiniteNumber(body.expiresAt)) return fail('expiresAt is required');

  return ok({
    transferId: body.transferId,
    senderDeviceId: body.senderDeviceId,
    senderAlias: body.senderAlias,
    senderFingerprint: body.senderFingerprint,
    protocolVersion: body.protocolVersion,
    files,
    totalBytes: body.totalBytes,
    textPreview: (body.textPreview as string | null) ?? null,
    expiresAt: body.expiresAt,
  });
}

export function validateCancelRequest(body: unknown): ValidationResult<CancelRequestBody> {
  if (!isPlainObject(body)) return fail('body must be a JSON object');
  if (!isNonEmptyString(body.transferId) || !TRANSFER_ID_PATTERN.test(body.transferId)) {
    return fail('transferId is invalid');
  }
  const validReasons = new Set(['sender_canceled', 'receiver_canceled', 'error']);
  if (!validReasons.has(body.reason as string)) return fail('reason is invalid');

  return ok({ transferId: body.transferId, reason: body.reason as CancelRequestBody['reason'] });
}

export function validateTextRequest(body: unknown): ValidationResult<TextRequestBody> {
  if (!isPlainObject(body)) return fail('body must be a JSON object');
  if (!isNonEmptyString(body.transferId) || !TRANSFER_ID_PATTERN.test(body.transferId)) {
    return fail('transferId is invalid');
  }
  if (!isNonEmptyString(body.senderDeviceId)) return fail('senderDeviceId is required');
  if (!isNonEmptyString(body.senderAlias)) return fail('senderAlias is required');
  if (!isNonEmptyString(body.senderFingerprint)) return fail('senderFingerprint is required');
  if (typeof body.text !== 'string' || body.text.length === 0) return fail('text is required');
  if (body.text.length > LIMITS.maxTextPayloadLength) {
    return fail(`text exceeds the ${LIMITS.maxTextPayloadLength}-char limit`);
  }
  if (!isFiniteNumber(body.createdAt)) return fail('createdAt is required');

  return ok({
    transferId: body.transferId,
    senderDeviceId: body.senderDeviceId,
    senderAlias: body.senderAlias,
    senderFingerprint: body.senderFingerprint,
    text: body.text,
    createdAt: body.createdAt,
  });
}

/** Body-size guard, applied before JSON parsing on the native side — kept
 *  here too so the same limit is unit-testable without spinning up a server. */
export function isWithinMetadataSizeLimit(rawByteLength: number): boolean {
  return rawByteLength <= LIMITS.maxMetadataBodyBytes;
}
