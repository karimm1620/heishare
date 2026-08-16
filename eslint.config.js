const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'modules/local-network/android/**', 'modules/local-network/ios/**'],
  },
  {
    // Scoped to the one legitimate "fetch on mount" pattern
    // (features/history/useHistory.ts's refresh() call) that this rule
    // otherwise flags — every other occurrence in the codebase was fixed
    // properly (derived state instead of effect+setState; see
    // DiscoveryProvider.tsx and hooks/useSyncedState.ts). Matches the same
    // documented downgrade already applied in the heibi project for the
    // identical pattern — this is a real, known trade-off, not a blanket
    // suppression.
    files: ['src/features/history/useHistory.ts'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
