// Sample JavaScript file with good practices

const config = {
    apiUrl: process.env.API_URL,
    timeout: 5000,
};

/**
 * Fetches user data with proper error handling
 * @param {string} userId - The user ID to fetch
 * @returns {Promise<object>} User data
 */
async function fetchUserData(userId) {
    try {
        const response = await fetch(`${config.apiUrl}/users/${userId}`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        throw error;
    }
}

/**
 * Processes an array of items safely
 * @param {Array} items - Items to process
 * @returns {Array} Processed items
 */
function processItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return [];
    }

    const results = [];

    for (let index = 0; index < items.length; index++) {
        const item = items[index];

        if (item && item.active) {
            results.push({
                id: item.id,
                name: item.name,
                processed: true,
            });
        }
    }

    return results;
}

/**
 * Validates user input before processing
 * @param {object} input - User input object
 * @returns {boolean} Whether input is valid
 */
function validateInput(input) {
    if (!input || typeof input !== 'object') {
        return false;
    }

    const requiredFields = ['name', 'email'];

    for (const field of requiredFields) {
        if (!input[field]) {
            return false;
        }
    }

    return true;
}

module.exports = { fetchUserData, processItems, validateInput };
