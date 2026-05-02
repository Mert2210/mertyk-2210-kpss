## 2024-05-24 - Node.js Event Loop Blocking from Array Iteration
**Learning:** In a socket-based Node.js backend, running three chained array iterations (`.map().filter().forEach()`) on a large array (e.g., 50,000+ items) on every client connection or request causes severe event loop blocking and CPU spikes.
**Action:** Always reduce multiple array passes to a single `for` loop (O(n)) and implement caching (`getCachedFilters()`) to avoid recalculating static or rarely-changing data on every client connection.
## 2024-05-24 - Avoid Chaining Array Methods on Large Datasets
**Learning:** Chaining array methods like `.filter().map()` on large datasets (e.g., `tumSorular` with 50,000+ items) allocates intermediate arrays, causing garbage collection spikes and event loop blocking in Node.js.
**Action:** Replace `.filter().map()` chains with a single `for` loop to process items and push to a result array in a single pass.
