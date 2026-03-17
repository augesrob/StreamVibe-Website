const STORAGE_KEY = 'tiktok_debug_log';

export const log = (step, data) => {
  try {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      step,
      data: typeof data === 'object' ? JSON.parse(JSON.stringify(data, getCircularReplacer())) : data
    };

    const currentLogs = getFullLog();
    currentLogs.push(entry);
    
    // Keep only last 100 logs to prevent overflow
    if (currentLogs.length > 100) {
      currentLogs.shift();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentLogs));
    console.log(`[DEBUG - ${step}]`, data);
  } catch (err) {
    console.error('Failed to write to debug log:', err);
  }
};

export const getFullLog = () => {
  try {
    const logs = localStorage.getItem(STORAGE_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (err) {
    console.error('Failed to read debug log:', err);
    return [];
  }
};

export const clearLog = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Debug log cleared');
  } catch (err) {
    console.error('Failed to clear debug log:', err);
  }
};

// Helper to handle circular references in JSON
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  };
};