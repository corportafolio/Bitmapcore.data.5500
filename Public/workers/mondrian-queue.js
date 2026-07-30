/*
 * Mondrian Queue
 * Queues and limits concurrent image generation to prevent main thread blocking
 */

let activeWorkers = 0;
const MAX_CONCURRENT = 2;
let queue = [];
let isProcessing = false;
let worker = null;

function ensureWorker() {
    if (!worker && 'OffscreenCanvas' in window) {
        worker = new Worker('\/workers\/mondrian-worker.js');
        worker.onmessage = function(e) {
            const data = e.data;
            if (data.type === 'worker-ready') {
                console.log('[MondrianQueue] Worker is ready');
                processQueue();
            } else if (data.type === 'generated') {
                activeWorkers--;
                processQueue();
                // Dispatch to cache
                if (window.ImageViewModel) {
                    const key = data.key;
                    const dataURL = data.dataURL;
                    const newCache = Object.assign({}, window.ImageViewModel._state.imageCache);
                    newCache[key] = dataURL;
                    window.ImageViewModel._set({ imageCache: newCache });
                }
            }
        };
        worker.onerror = function(e) {
            console.error('[MondrianQueue] Worker error:', e);
            worker = null;
        };
    }
}

function addToQueue(blockNumber, options, size) {
    return new Promise(function(resolve) {
        queue.push({ blockNumber, options, size, resolve });
        if (!isProcessing) {
            isProcessing = true;
            processQueue();
        }
    });
}

function processQueue() {
    if (queue.length === 0 || activeWorkers >= MAX_CONCURRENT) {
        return;
    }
    ensureWorker();
    if (!worker) {
        isProcessing = false;
        return;
    }

    const item = queue.shift();
    activeWorkers++;
    isProcessing = true;

    const key = item.blockNumber + '_' + item.size + '_' + (item.options.hash || '') + '_' + (item.options.totalTransactions || 0) + '_' + (item.options.etiquetas || '');

    worker.postMessage({
        type: 'generate',
        blockNumber: item.blockNumber,
        options: {
            totalTransactions: item.options.totalTransactions || 0,
            hash: item.options.hash || '',
            isPerfect: item.options.isPerfect || false,
            isPunk: item.options.isPunk || false,
            etiquetas: item.options.etiquetas || '',
            transactions: item.options.transactions || []
        },
        size: item.size
    });
}

window.MondrianQueue = {
    add: addToQueue,
    getActiveWorkers: function() {
        return activeWorkers;
    },
    clearQueue: function() {
        queue = [];
        isProcessing = false;
    },
    terminate: function() {
        if (worker) {
            worker.terminate();
            worker = null;
        }
        this.clearQueue();
    }
};