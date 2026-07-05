// Firebase SDK relies on this exact filename by default for some internal background push processes.
// We redirect all its logic to our main service worker.
importScripts('sw.js');
