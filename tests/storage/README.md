# Storage tests

`src/lib/storage/*` are thin AsyncStorage wrappers. AsyncStorage's real
implementation is native; these would need `@react-native-async-storage/async-storage/jest/async-storage-mock`
wired in to test meaningfully beyond what's already covered indirectly by
the transferMachine/history logic tests. Left as a follow-up rather than
adding a mock-only test that doesn't exercise real behavior.
