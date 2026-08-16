# LocalShare — Performance, Throughput & 50 MB Constraint

## 1. Hard target

The application must target a maximum installed/release size of 50 MB.

The team must define and document the exact measurement:

- Android APK size for the target architecture.
- Android App Bundle download size where applicable.
- iOS archive/app size for the supported build configuration.

Do not declare the target met based only on JavaScript bundle size.

## 2. Performance priorities

Priority order:

1. Reliable transfer.
2. High sustained throughput.
3. Low memory usage.
4. Fast device discovery.
5. Fast app startup.
6. Low idle battery/network overhead.
7. Small binary size.

## 3. Streaming

Never do this for large files:

```ts
const data = await FileSystem.readAsStringAsync(...);
```

Do not convert large files into base64 for transfer.

Use streaming APIs in the native layer so that memory usage does not scale with file size.

## 4. Progress updates

Native networking should aggregate progress events.

Example policy:

- Emit progress no more often than approximately 10–20 times per second.
- Coalesce repeated events.
- Allow the UI to render at normal frame rate.
- Never dispatch a React update for each chunk.

The exact frequency must be benchmarked.

## 5. Discovery performance

- Use small UDP packets.
- Keep discovery payloads compact.
- Use bounded retries.
- Cache peer state.
- Remove stale peers after a reasonable timeout.
- Avoid repeated network scans when multicast already works.

## 6. Transfer performance

Use:

- Streaming I/O.
- Persistent connection reuse when safe.
- Large enough buffers to avoid excessive syscall overhead.
- Minimal serialization.
- No compression by default for already-compressed files.
- Native file-to-socket pipelines where supported.

Do not optimize by disabling TLS.

## 7. Compression policy

Do not compress:

- JPEG/PNG/WebP.
- MP4/MKV/MOV.
- ZIP/7Z/RAR.
- PDF.
- Most archives.

Compression can be considered only for small text payloads if measurements prove a benefit.

## 8. React performance

- Keep device list updates localized.
- Memoize device cards.
- Memoize transfer rows.
- Use stable keys.
- Use virtualized lists.
- Avoid global state updates for every transfer chunk.
- Avoid recreating large arrays on every render.

## 9. Native bridge performance

Avoid sending:

- Raw binary chunks into JavaScript.
- Large metadata objects repeatedly.
- One event per network packet.

Prefer sending:

- Transfer ID.
- File ID.
- Bytes transferred.
- Total bytes.
- State.
- Error code/category.

## 10. Startup performance

- Avoid eager initialization of nonessential screens.
- Start local networking at the correct application lifecycle point.
- Do not block first render on peer discovery.
- Defer history loading.
- Lazy-load settings-only functionality when possible.

## 11. Memory budget

The app must remain stable when transferring large files.

A transfer of a 4 GB file must not imply a 4 GB JS memory footprint.

Measure:

- JS heap.
- Native memory.
- Peak memory during upload.
- Peak memory during receive.
- Memory after cancellation.
- Memory after repeated transfers.

## 12. Benchmark suite

Benchmark at least:

- Discovery time to first peer.
- Time from tap Send to receiver request.
- 100 MB transfer.
- 1 GB transfer.
- Multiple-file transfer.
- Small text transfer.
- Transfer cancellation latency.
- Resume/retry behavior if implemented.
- Cold startup.
- Warm startup.
- Idle memory.
- Transfer memory.

Record:

- Average throughput.
- Peak throughput.
- Completion time.
- CPU usage where measurable.
- Peak memory.
- Battery impact where measurable.

## 13. Definition of done for performance

The project is not "fast" because it feels fast.

It must include measured results and explain bottlenecks.

Do not blindly increase buffer sizes, concurrency, or thread count without benchmarks.
