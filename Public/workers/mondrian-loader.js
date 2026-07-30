/*
 * Optimized Mondrian Loading System
 * Single IntersectionObserver + batch generation
 */

// Global state
let activeObservers = 0;
let visibleImages = new Set();
let observer = null;
let generationQueue = [];
let isProcessingQueue = false;
const MAX_VISIBLE = 50; // Maximum images rendered simultaneously
const BATCH_SIZE = 20; // Images to generate per batch

// Initialize single observer
function initObserver() {
    if (observer) return;
    
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const key = entry.target.dataset.key;
                visibleImages.add(key);
                scheduleForGeneration(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '400px 0px', // Proactive loading
        threshold: 0.01
    });
}

// Schedule images for batched generation
function scheduleForGeneration(element) {
    const key = element.dataset.key;
    if (generationQueue.some(item => item.key === key)) return;
    
    generationQueue.push({
        element,
        key,
        timestamp: Date.now()
    });
    
    if (!isProcessingQueue) {
        processQueue();
    }
}

// Process generation queue with rate limiting
function processQueue() {
    if (visibleImages.size >= MAX_VISIBLE || generationQueue.length === 0) {
        setTimeout(processQueue, 100);
        return;
    }
    
    const batch = generationQueue.splice(0, BATCH_SIZE);
    
    Promise.all(batch.map(item => generateSingle(item)))
        .then(() => {
            setTimeout(processQueue, 0);
        })
        .catch(err => {
            console.error('[ImageLoader] Generation error:', err);
            setTimeout(processQueue, 1000);
        });
}

// Single image generation with worker
async function generateSingle(item) {
    const { blockNumber, size, hash, totalTransactions, etiquetas, isPerfect, isPunk, resolve, reject } = item;
    
    return new Promise((res, rej) => {
        // Check cache first
        if (window.ImageViewModel) {
            const key = blockNumber + '_' + size + '_' + hash + '_' + totalTransactions + '_' + etiquetas;
            const cached = window.ImageViewModel.getCachedSync(blockNumber, size, {
                hash,
                totalTransactions,
                etiquetas,
                isPerfect,
                isPunk
            });
            if (cached) {
                setImage(element, cached);
                return res();
            }
        }
        
        // Generate via worker
        if (window.MondrianWorker) {
            window.MondrianWorker.generate(blockNumber, size, {
                hash,
                totalTransactions,
                etiquetas,
                isPerfect,
                isPunk
            }).then(dataURL => {
                setImage(element, dataURL);
                res();
            }).catch(err => {
                rej(err);
            });
        } else {
            rej(new Error('Worker not available'));
        }
    });
}

function setImage(element, dataURL) {
    element.style.backgroundImage = `url(${dataURL})`;
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
    element.classList.add('image-loaded');
}

// Public API
window.MondrianLoader = {
    init: function() {
        initObserver();
    },
    register: function(element, blockNumber, size, options) {
        element.dataset.key = Date.now() + '_' + blockNumber;
        element.dataset.blockNumber = blockNumber;
        element.style.width = size + 'px';
        element.style.height = size + 'px';
        
        if (observer) {
            observer.observe(element);
        }
        
        return {
            cleanup: () => {
                if (observer) observer.unobserve(element);
                visibleImages.delete(element.dataset.key);
                const idx = generationQueue.findIndex(item => item.element === element);
                if (idx > -1) generationQueue.splice(idx, 1);
            }
        };
    },
    getStats: function() {
        return {
            visible: visibleImages.size,
            queued: generationQueue.length,
            maxVisible: MAX_VISIBLE
        };
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.MondrianLoader.init();
});