/*
 * Mondrian Queue
 * Optimized for Ordinalswallet page with 11,923 listings
 */

let activeWorkers = 0;
const MAX_CONCURRENT = 2;
let queue = [];
let isProcessing = false;
let worker = null;
let workerAvailable = false;

function ensureWorker() {
    if (workerAvailable) return;
    
    if (!worker && 'SharedArrayBuffer' in window && 'OffscreenCanvas' in window) {
        try {
            worker = new Worker('/workers/mondrian-worker.js');
            worker.onmessage = function(e) {
                const data = e.data;
                if (data.type === 'worker-ready') {
                    console.log('[MondrianQueue] Worker is ready');
                    workerAvailable = true;
                    processQueue();
                } else if (data.type === 'generated') {
                    activeWorkers--;
                    processQueue();
                    
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
                workerAvailable = false;
            };
            
            worker.postMessage({ type: 'init' });
        } catch (e) {
            console.error('[MondrianQueue] Failed to create worker:', e);
        }
    } else {
        console.warn('[MondrianQueue] OffscreenCanvas not available, worker will not be used');
    }
}

function addToQueue(blockNumber, options, size, resolve, reject, isInitial) {
    const key = blockNumber + '_' + size + '_' + (options.hash || '') + '_' + (options.totalTransactions || 0) + '_' + (options.etiquetas || '');
    
    queue.push({ blockNumber, options, size, key, resolve, reject, isInitial });
    
    if (!isProcessing) {
        isProcessing = true;
        processQueue();
    }
}

function processQueue() {
    const initialItems = queue.filter(item => item.isInitial);
    
    if (initialItems.length === 0) {
        isProcessing = false;
        return;
    }
    
    const canProcess = activeWorkers < MAX_CONCURRENT;
    
    if (canProcess && queue.length > 0) {
        const item = queue.shift();
        activeWorkers++;
        
        if (worker && workerAvailable) {
            worker.postMessage({
                type: 'generate',
                key: item.key,
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
        } else {
            activeWorkers--;
            isProcessing = false;
            if (item.reject) {
                item.reject(new Error('Worker not available'));
            }
        }
    }
    
    if (queue.length > 0) {
        setTimeout(processQueue, 0);
    } else {
        isProcessing = false;
    }
}

function cleanup() {
    if (worker) {
        worker.terminate();
        worker = null;
        workerAvailable = false;
    }
    queue = [];
    isProcessing = false;
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
    cleanup: cleanup,
    getQueueLength: function() {
        return queue.length;
    }
};

