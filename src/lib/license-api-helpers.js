import { generateUniqueKeyCode, calculateExpirationDate } from './license-key-utils';

/**
 * Helper to generate a batch of keys client-side (for preview/validation).
 * Actual creation should happen server-side.
 */
export const generateBatchKeys = (count, type = 'standard') => {
    return Array.from({ length: count }, () => generateUniqueKeyCode());
};

/**
 * Formats a date for API transmission (ISO string).
 */
export const formatApiDate = (date) => {
    if (!date) return null;
    return new Date(date).toISOString();
};

/**
 * Parses API response for license status.
 */
export const parseLicenseStatus = (licenseData) => {
    if (!licenseData) return 'Unknown';
    if (licenseData.status === 'active') {
        const expires = new Date(licenseData.expires_at);
        if (expires < new Date()) return 'Expired';
        return 'Active';
    }
    return licenseData.status; // redeemed, revoked, etc.
};

/**
 * Exports data to CSV.
 */
export const exportToCsv = (data, filename) => {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};