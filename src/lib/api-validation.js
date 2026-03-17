import { API_ENDPOINTS } from './api-endpoints';

/**
 * Validates a license key format.
 * @param {string} key 
 * @returns {boolean}
 */
export const isValidKeyFormat = (key) => {
    const regex = /^KEY-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    const trialRegex = /^TRIAL-[A-Z0-9]{8}$/;
    return regex.test(key) || trialRegex.test(key);
};

/**
 * Validates an API key format.
 * @param {string} key 
 * @returns {boolean}
 */
export const isValidApiKeyFormat = (key) => {
    return /^sk_[a-zA-Z0-9]{32,}$/.test(key);
};

/**
 * Maps HTTP status codes to user-friendly messages.
 * @param {number} status 
 * @returns {string}
 */
export const getErrorMessage = (status) => {
    switch (status) {
        case 400: return "Bad Request - Invalid parameters provided.";
        case 401: return "Unauthorized - API key missing or invalid.";
        case 403: return "Forbidden - Insufficient permissions.";
        case 404: return "Not Found - Resource does not exist.";
        case 429: return "Rate Limit Exceeded - Please slow down.";
        case 500: return "Internal Server Error - Something went wrong on our end.";
        default: return "An unexpected error occurred.";
    }
};

/**
 * Checks if a response indicates a rate limit error.
 * @param {Response} response 
 * @returns {boolean}
 */
export const isRateLimited = (response) => {
    return response.status === 429;
};