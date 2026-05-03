## 2024-05-24 - Node.js Event Loop Blocking from Array Iteration
**Learning:** In a socket-based Node.js backend, running three chained array iterations (`.map().filter().forEach()`) on a large array (e.g., 50,000+ items) on every client connection or request causes severe event loop blocking and CPU spikes.
**Action:** Always reduce multiple array passes to a single `for` loop (O(n)) and implement caching (`getCachedFilters()`) to avoid recalculating static or rarely-changing data on every client connection.
## 2024-05-24 - Single loop vs Chained array operations
**Learning:** Chaining array methods like `.filter()` on large datasets (e.g., `tumSorular`) in Node.js allocates intermediate arrays, causing CPU spikes and event loop blocking.
**Action:** Use a single `for` loop to prevent allocating intermediate arrays, improving performance on large collections.
