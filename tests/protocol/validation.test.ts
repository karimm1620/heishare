import { PROTOCOL_VERSION } from '@/lib/protocol/constants';
import {
  validateCancelRequest,
  validatePrepareUploadRequest,
  validateRegisterRequest,
  validateTextRequest,
} from '@/lib/protocol/validation';

const VALID_REGISTER = {
  deviceId: 'device-1',
  alias: 'Pixel 9',
  deviceType: 'mobile',
  protocolVersion: PROTOCOL_VERSION,
  port: 53317,
  fingerprint: 'aa:bb:cc',
  capabilities: { receiveFiles: true, receiveText: true, maxConcurrentUploads: 1 },
};

const VALID_TRANSFER_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

const VALID_PREPARE_UPLOAD = {
  transferId: VALID_TRANSFER_ID,
  senderDeviceId: 'device-1',
  senderAlias: 'Pixel 9',
  senderFingerprint: 'aa:bb:cc',
  protocolVersion: PROTOCOL_VERSION,
  files: [{ fileId: VALID_TRANSFER_ID, name: 'photo.jpg', size: 1024, mimeType: 'image/jpeg' }],
  totalBytes: 1024,
  textPreview: null,
  expiresAt: Date.now() + 60_000,
};

describe('validateRegisterRequest', () => {
  it('accepts a well-formed request', () => {
    const result = validateRegisterRequest(VALID_REGISTER);
    expect(result.ok).toBe(true);
  });

  it('rejects a non-object body', () => {
    expect(validateRegisterRequest(null).ok).toBe(false);
    expect(validateRegisterRequest('nope').ok).toBe(false);
    expect(validateRegisterRequest([]).ok).toBe(false);
  });

  it('rejects an invalid deviceType', () => {
    const result = validateRegisterRequest({ ...VALID_REGISTER, deviceType: 'toaster' });
    expect(result.ok).toBe(false);
  });

  it('rejects a mismatched protocol version', () => {
    const result = validateRegisterRequest({ ...VALID_REGISTER, protocolVersion: '0.1' });
    expect(result.ok).toBe(false);
  });

  it('rejects an out-of-range port', () => {
    expect(validateRegisterRequest({ ...VALID_REGISTER, port: 0 }).ok).toBe(false);
    expect(validateRegisterRequest({ ...VALID_REGISTER, port: 70000 }).ok).toBe(false);
  });
});

describe('validatePrepareUploadRequest', () => {
  it('accepts a well-formed request', () => {
    const result = validatePrepareUploadRequest(VALID_PREPARE_UPLOAD);
    expect(result.ok).toBe(true);
  });

  it('rejects when totalBytes does not match the sum of file sizes', () => {
    const result = validatePrepareUploadRequest({ ...VALID_PREPARE_UPLOAD, totalBytes: 999 });
    expect(result.ok).toBe(false);
  });

  it('rejects an empty files array', () => {
    const result = validatePrepareUploadRequest({ ...VALID_PREPARE_UPLOAD, files: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed transferId', () => {
    const result = validatePrepareUploadRequest({ ...VALID_PREPARE_UPLOAD, transferId: 'not-a-uuid' });
    expect(result.ok).toBe(false);
  });

  it('rejects a file entry with a negative size', () => {
    const result = validatePrepareUploadRequest({
      ...VALID_PREPARE_UPLOAD,
      files: [{ ...VALID_PREPARE_UPLOAD.files[0], size: -1 }],
      totalBytes: -1,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects more files than LIMITS.maxFilesPerTransfer', () => {
    const files = Array.from({ length: 201 }, (_, i) => ({
      fileId: VALID_TRANSFER_ID,
      name: `file-${i}.txt`,
      size: 1,
      mimeType: null,
    }));
    const result = validatePrepareUploadRequest({
      ...VALID_PREPARE_UPLOAD,
      files,
      totalBytes: files.length,
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateCancelRequest', () => {
  it('accepts a well-formed request', () => {
    const result = validateCancelRequest({ transferId: VALID_TRANSFER_ID, reason: 'sender_canceled' });
    expect(result.ok).toBe(true);
  });

  it('rejects an invalid reason', () => {
    const result = validateCancelRequest({ transferId: VALID_TRANSFER_ID, reason: 'because' });
    expect(result.ok).toBe(false);
  });
});

describe('validateTextRequest', () => {
  const base = {
    transferId: VALID_TRANSFER_ID,
    senderDeviceId: 'device-1',
    senderAlias: 'Pixel 9',
    senderFingerprint: 'aa:bb:cc',
    text: 'hello from heishare',
    createdAt: Date.now(),
  };

  it('accepts a well-formed request', () => {
    expect(validateTextRequest(base).ok).toBe(true);
  });

  it('rejects empty text', () => {
    expect(validateTextRequest({ ...base, text: '' }).ok).toBe(false);
  });

  it('rejects text over the configured limit', () => {
    expect(validateTextRequest({ ...base, text: 'a'.repeat(100_001) }).ok).toBe(false);
  });
});
