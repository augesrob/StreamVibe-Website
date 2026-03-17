/**
 * Generates a consistent Hardware ID based on browser fingerprinting.
 * Note: This is a client-side approximation and not a true hardware ID.
 * It uses available browser characteristics to create a semi-unique identifier.
 */
export const generateHWID = async () => {
  try {
    const components = [
      navigator.userAgent,
      navigator.language,
      window.screen.colorDepth,
      window.screen.width + 'x' + window.screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency,
      navigator.deviceMemory,
      // Canvas fingerprinting (simple version)
      getCanvasFingerprint()
    ];

    const fingerprintString = components.join('###');
    
    // Use SHA-256 to hash the components
    const msgBuffer = new TextEncoder().encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.substring(0, 32); // Return first 32 chars as HWID
  } catch (e) {
    console.error("HWID Generation failed", e);
    // Fallback if crypto fails
    return 'UNKNOWN-HWID-' + Math.random().toString(36).substring(7);
  }
};

const getCanvasFingerprint = () => {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no-canvas';
        
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("HWID_FINGERPRINT", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("HWID_FINGERPRINT", 4, 17);
        
        return canvas.toDataURL();
    } catch (e) {
        return 'canvas-error';
    }
};

/**
 * Task 6: Utility to get both IP and HWID
 * Fetches public IP from external service and generates HWID.
 * Returns { ip: string|null, hwid: string }
 */
export const getClientIPAndHWID = async () => {
    let ip = null;
    let hwid = null;

    try {
        // Run in parallel for speed
        const [ipResult, hwidResult] = await Promise.allSettled([
            fetch('https://api.ipify.org?format=json').then(res => res.json()),
            generateHWID()
        ]);

        if (ipResult.status === 'fulfilled') {
            ip = ipResult.value.ip;
        } else {
            console.warn("Failed to resolve IP:", ipResult.reason);
        }

        if (hwidResult.status === 'fulfilled') {
            hwid = hwidResult.value;
        } else {
             // Fallback
             hwid = 'FALLBACK-' + Date.now();
        }

    } catch (e) {
        console.error("Error collecting Client Info:", e);
    }

    return { ip, hwid };
};