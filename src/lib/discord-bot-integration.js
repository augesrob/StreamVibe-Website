import { API_ENDPOINTS } from '@/lib/api-endpoints';

/**
 * Discord Bot Integration Helper
 * 
 * Usage from Discord Bot (Node.js example):
 * 
 * const { verifyLicenseForDiscord } = require('./discord-bot-integration');
 * 
 * client.on('messageCreate', async message => {
 *   if (message.content.startsWith('!verify')) {
 *     const key = message.content.split(' ')[1];
 *     const result = await verifyLicenseForDiscord(key);
 *     if (result.valid) {
 *        // Grant role
 *     }
 *   }
 * });
 */

export const verifyLicenseForDiscord = async (keyCode) => {
    try {
        const response = await fetch(API_ENDPOINTS.VERIFY_LICENSE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key_code: keyCode })
        });
        return await response.json();
    } catch (error) {
        return { valid: false, message: error.message };
    }
};

export const formatLicenseInfoForDiscord = (licenseData) => {
    if (!licenseData.valid) {
        return {
            title: "License Verification Failed",
            color: 0xFF0000, // Red
            description: licenseData.message || "Invalid or expired key."
        };
    }

    return {
        title: "License Verified",
        color: 0x00FF00, // Green
        fields: [
            { name: "Plan", value: licenseData.plan_name, inline: true },
            { name: "Status", value: licenseData.status, inline: true },
            { name: "Expires", value: new Date(licenseData.expiration).toLocaleDateString(), inline: true }
        ]
    };
};