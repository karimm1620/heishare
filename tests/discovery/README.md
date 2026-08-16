# Discovery tests

Multicast join/announce/receive (`modules/local-network/android/.../UdpMulticastDiscovery.kt`)
needs two real devices (or an emulator pair with multicast routing configured
— the standard Android emulator's virtual NIC does not reliably support
multicast) on the same network. Not automatable in this Jest suite.

Manual test matrix: see `docs/prd/07-implementation-roadmap.md` Phase 8.
