# Integration tests

End-to-end device-to-device transfer (discovery -> prepare -> accept ->
stream -> verify -> commit) requires the compiled native module running on
two real devices — see README.md "Native module status" at the project
root. Track manual runs against the Phase 8 matrix in
`docs/prd/07-implementation-roadmap.md` until that's automatable (e.g. via
Maestro/Detox against two paired emulators, once multicast-over-emulator or
a discovery-fallback path is confirmed working).
