/**
 * Single point where the app decides which LocalNetworkService
 * implementation to use. Production and release builds ALWAYS get
 * nativeLocalNetworkService — the mock is only reachable when both:
 *   1. `__DEV__` is true (impossible in a release build), and
 *   2. `EXPO_PUBLIC_USE_MOCK_NETWORK=1` is set in the environment.
 *
 * This exists so UI work can happen in Expo Go / web before the native
 * module has been compiled via `eas build` — see README.md.
 */

import type { LocalNetworkService } from '@/types/native-module';

function resolveService(): LocalNetworkService {
  if (__DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_NETWORK === '1') {
    // Isolated dynamic require: keeps the mock's code (and its console.warn)
    // out of anything that isn't explicitly opted in. require() (not a
    // static import) is deliberate here — see the eslint-disable below.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMockLocalNetworkService } = require('./__dev__/mockLocalNetworkService');
    return createMockLocalNetworkService();
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { nativeLocalNetworkService } = require('./nativeLocalNetworkService');
  return nativeLocalNetworkService as LocalNetworkService;
}

export const localNetworkService: LocalNetworkService = resolveService();
