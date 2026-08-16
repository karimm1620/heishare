/**
 * Production implementation of LocalNetworkService (types/native-module.ts),
 * backed by the real native module at modules/local-network.
 *
 * This is the ONLY production path. See localNetworkService.ts for how this
 * is selected, and __dev__/mockLocalNetworkService.ts for the isolated
 * dev-only alternative used when the native module isn't present.
 */

import LocalNetworkNative from 'local-network';

import type {
  LocalNetworkService,
  TransferErrorCategory,
} from '@/types/native-module';

export const nativeLocalNetworkService: LocalNetworkService = {
  start: (config) => LocalNetworkNative.start(config),
  stop: () => LocalNetworkNative.stop(),
  getLocalAddresses: () => LocalNetworkNative.getLocalAddresses(),
  getInfo: () => LocalNetworkNative.getInfo(),

  startDiscovery: () => LocalNetworkNative.startDiscovery(),
  stopDiscovery: () => LocalNetworkNative.stopDiscovery(),
  sendAnnouncement: (payload) => LocalNetworkNative.sendAnnouncement(payload),

  prepareUpload: (request) => LocalNetworkNative.prepareUpload(request),
  startUpload: (transferId) => LocalNetworkNative.startUpload(transferId),
  sendText: (request) => LocalNetworkNative.sendText(request),

  respondToTransfer: (transferId, accept) => LocalNetworkNative.respondToTransfer(transferId, accept),
  cancelTransfer: (transferId) => LocalNetworkNative.cancelTransfer(transferId),

  onDeviceDiscovered: (listener) => {
    const sub = LocalNetworkNative.addListener('onDeviceDiscovered', listener);
    return () => sub.remove();
  },
  onDeviceLost: (listener) => {
    const sub = LocalNetworkNative.addListener('onDeviceLost', (event) => listener(event.deviceId));
    return () => sub.remove();
  },
  onIncomingTransferRequest: (listener) => {
    const sub = LocalNetworkNative.addListener('onIncomingTransferRequest', listener);
    return () => sub.remove();
  },
  onTransferDecision: (listener) => {
    const sub = LocalNetworkNative.addListener('onTransferDecision', listener);
    return () => sub.remove();
  },
  onTransferProgress: (listener) => {
    // errorCategory crosses the native bridge as a plain string — narrow it
    // here at the boundary rather than threading TransferErrorCategory
    // through the native package's own (deliberately loose) wire types.
    const sub = LocalNetworkNative.addListener('onTransferProgress', (event) =>
      listener({ ...event, errorCategory: event.errorCategory as TransferErrorCategory | null }),
    );
    return () => sub.remove();
  },
  onServerError: (listener) => {
    const sub = LocalNetworkNative.addListener('onServerError', (event) =>
      listener({ ...event, category: event.category as TransferErrorCategory }),
    );
    return () => sub.remove();
  },
};
