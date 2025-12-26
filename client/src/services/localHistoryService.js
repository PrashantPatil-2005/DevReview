/**
 * Local History Service
 * 
 * Stores analysis history in localStorage (browser only).
 * Each user only sees their own history - no server storage.
 */

const STORAGE_KEY = 'devreview_history';
const MAX_HISTORY_ITEMS = 50; // Limit to prevent localStorage bloat

/**
 * Gets all history items from localStorage
 * @returns {Array} Array of review objects
 */
export function getHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data);
    } catch (err) {
        console.error('Failed to read history:', err);
        return [];
    }
}

/**
 * Saves a review to local history
 * @param {Object} review - Review result to save
 * @returns {string} Generated ID for the review
 */
export function saveToHistory(review) {
    try {
        const history = getHistory();

        // Generate a local ID
        const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const historyItem = {
            _id: id,
            ...review,
            createdAt: new Date().toISOString(),
            isLocal: true,
        };

        // Add to beginning (newest first)
        history.unshift(historyItem);

        // Limit history size
        if (history.length > MAX_HISTORY_ITEMS) {
            history.splice(MAX_HISTORY_ITEMS);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

        return id;
    } catch (err) {
        console.error('Failed to save to history:', err);
        return null;
    }
}

/**
 * Gets a single review by ID from local history
 * @param {string} id - Review ID
 * @returns {Object|null} Review object or null if not found
 */
export function getReviewById(id) {
    const history = getHistory();
    return history.find(item => item._id === id) || null;
}

/**
 * Deletes a review from local history
 * @param {string} id - Review ID to delete
 * @returns {boolean} True if deleted successfully
 */
export function deleteFromHistory(id) {
    try {
        const history = getHistory();
        const filtered = history.filter(item => item._id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (err) {
        console.error('Failed to delete from history:', err);
        return false;
    }
}

/**
 * Clears all local history
 * @returns {boolean} True if cleared successfully
 */
export function clearHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (err) {
        console.error('Failed to clear history:', err);
        return false;
    }
}

/**
 * Checks if an ID is a local history ID
 * @param {string} id - ID to check
 * @returns {boolean}
 */
export function isLocalId(id) {
    return id && id.startsWith('local_');
}
