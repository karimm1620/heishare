# LocalShare — UI/UX Requirements

## 1. Design direction

The UI should feel native, fast, calm, and utility-first.

Avoid visual noise, unnecessary gradients, oversized decorative illustrations, and dashboard-like clutter.

The app is primarily a tool for:

1. finding nearby devices,
2. sending,
3. receiving,
4. seeing transfer status.

## 2. Navigation

Use Expo Router.

Suggested route layout:

```text
app/
├── _layout.tsx
├── index.tsx
├── send.tsx
├── receive.tsx
├── transfers.tsx
├── history.tsx
└── settings.tsx
```

Nested routes may be introduced when they improve information architecture.

## 3. Home screen

The home screen must show:

- Current device alias.
- Network/discoverability state.
- Nearby devices.
- Primary send action.
- Active incoming/outgoing transfers.
- Optional recent transfer summary.

States:

- Searching.
- Ready.
- No devices found.
- Network unavailable.
- Local-network permission missing.
- Server unavailable.
- Port conflict.

## 4. Nearby device card

Each peer should expose:

- Device icon.
- Alias.
- Device type.
- Connection status.
- Optional remembered/trusted indicator.
- Fingerprint access for advanced verification.

Avoid displaying raw IP addresses in the primary card unless needed for diagnostics.

## 5. Send flow

Recommended sequence:

Home → Choose device → Select files/text → Review → Send → Progress → Complete.

The user must be able to cancel before the receiver accepts and during transfer where technically safe.

## 6. Incoming request sheet

The incoming transfer UI should prioritize:

- Sender alias.
- Sender fingerprint/verification affordance.
- File names.
- File count.
- Total size.
- Accept button.
- Reject button.

Do not hide the identity of the sender behind ambiguous icons.

## 7. Transfer progress

Show:

- Overall progress.
- Current file.
- Bytes transferred / total bytes.
- Transfer state.
- Optional throughput.
- Estimated remaining time when stable enough.

Do not update React state on every network byte.

Progress updates should be throttled/coalesced by the networking layer.

## 8. Error UI

Errors should use human language.

Examples:

- "The device is no longer reachable."
- "The other device rejected the transfer."
- "This network prevents devices from communicating with each other."
- "The file could not be saved because storage is unavailable."
- "The secure connection could not be established."

Avoid showing raw Java/Kotlin/Swift exceptions to normal users.

## 9. Native UI integration

Use React Native Reusables for reusable cross-platform primitives where appropriate.

Use NativeWind 4 for styling.

Use `@expo/ui/jetpack-compose` for Android-native UI surfaces when the native control provides a real platform benefit, such as:

- Material 3-native controls.
- Android-native contextual surfaces.
- Native interactions where React Native approximation would reduce quality.

Do not force Jetpack Compose into every screen.

Every Jetpack Compose component must follow the Expo UI API and be hosted correctly.

## 10. Accessibility

- Dynamic text sizes where supported.
- Content descriptions for meaningful icons.
- Sufficient color contrast.
- Touch targets large enough for comfortable interaction.
- Never communicate transfer status using color alone.
- Screen reader labels for send/accept/reject/cancel actions.

## 11. Performance UX

Avoid:

- Heavy blur everywhere.
- Huge image assets.
- Infinite animated backgrounds.
- Re-rendering the entire device list for a transfer-progress update.
- Rendering thousands of transfer-history rows without virtualization.

Prefer:

- Flat, simple surfaces.
- Memoized device/transfer rows.
- Virtualized lists.
- Lightweight icons.
- Event-driven state updates.
