/**
 * TikTok API Mock Data Detector
 * Analyzes video/user data to determine if it's coming from a live API or a mock source.
 */

export const detectMockData = (data) => {
    let result = {
        isMockData: false,
        confidence: 0,
        indicators: []
    };

    if (!data) return result;

    const videos = Array.isArray(data) ? data : (data.videos || []);

    // 1. Check for explicit mock flags if the backend sets them
    if (data._isMock || data.is_mock) {
        result.isMockData = true;
        result.confidence = 100;
        result.indicators.push("Explicit '_isMock' flag found in response");
    }

    // 2. Analyze Videos
    if (videos.length > 0) {
        const sampleVideo = videos[0];

        // Check for placeholder IDs
        if (sampleVideo.id === 'mock-video-1' || sampleVideo.id === 'test-video-id') {
            result.isMockData = true;
            result.confidence = 100;
            result.indicators.push("Known mock video ID found: " + sampleVideo.id);
        }

        // Check for static/placeholder descriptions
        const descriptions = videos.map(v => v.desc || v.description || '');
        if (descriptions.some(d => d.includes("Mock Video") || d.includes("Test Description"))) {
             result.isMockData = true;
             result.confidence += 80;
             result.indicators.push("Mock text found in video descriptions");
        }

        // Check for unrealistic metrics (perfect round numbers often indicate mocks)
        if (sampleVideo.statistics) {
            if (sampleVideo.statistics.digg_count === 12345 || sampleVideo.statistics.play_count === 1000000) {
                result.isMockData = true;
                result.confidence += 50;
                result.indicators.push("Suspiciously perfect metric numbers detected");
            }
        }
    }

    // 3. Analyze latency (mock data is usually near-instant, real API takes time)
    // This requires passing latency meta-data which might not be available here, skipping for now.

    // Cap confidence
    result.confidence = Math.min(result.confidence, 100);

    return result;
};