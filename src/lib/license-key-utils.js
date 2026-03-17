
import { format } from 'date-fns';
import { API_ENDPOINTS, getEdgeFunctionUrl } from '@/lib/api-endpoints';

export const formatKeyCode = (key) => {
    // Basic formatting ensuring uppercase
    return key?.toUpperCase() || '';
};

export const validateKeyFormat = (key) => {
    const regex = /^KEY-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    const trialRegex = /^TRIAL-[A-Z0-9]{8}$/;
    return regex.test(key) || trialRegex.test(key);
};

export const generateUniqueKeyCode = () => {
    const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `KEY-${segment()}-${segment()}-${segment()}`;
};

export const calculateExpirationDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + parseInt(days));
    return date;
};

export const formatExpirationDisplay = (dateString) => {
    if (!dateString) return 'No Expiration';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires Today';
    return `Expires in ${diffDays} days`;
};

export const exportKeysAsCSV = (keys, filename = 'license_keys.csv') => {
    if (!keys || !keys.length) return;
    
    const headers = ['Key Code', 'Plan', 'Status', 'Created At', 'Expires At'];
    const csvContent = [
        headers.join(','),
        ...keys.map(k => [
            k.key_code,
            // Audit fix: replaced billing_plans with plans to match schema
            k.plans?.name || 'Unknown Plan',
            k.status,
            k.created_at,
            k.expires_at || 'Never'
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const parseCSVKeys = (csvContent) => {
    // Basic parser for imported keys if needed
    const lines = csvContent.split('\n');
    return lines.slice(1).map(line => {
        const [keyCode] = line.split(',');
        return keyCode?.trim();
    }).filter(Boolean);
};

// URL Helpers for External Use
export const getVerifyLicenseUrl = () => API_ENDPOINTS.VERIFY_LICENSE;
export const getRedeemLicenseUrl = () => API_ENDPOINTS.REDEEM_LICENSE;
