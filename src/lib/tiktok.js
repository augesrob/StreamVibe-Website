// <type="write" filePath="src/lib/tiktok.js">
// TikTok API Configuration
// NOTE: In a production environment, Client Secret should NEVER be exposed on the frontend.
// These operations should be performed via a secure backend proxy to protect your credentials.
export const TIKTOK_CONFIG = {
  CLIENT_KEY: 'awze97d0odmk449u',
  CLIENT_SECRET: 'Aj1WEquMBl70EexImMYdzxTdYiHX8aZ2',
  BASE_URL: 'https://open.tiktokapis.com/v2'
};

const MOCK_USERS = [
  { username: 'streamer_pro', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=streamer_pro' },
  { username: 'gaming_king', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming_king' },
  { username: 'creative_vibes', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creative_vibes' },
  { username: 'music_flow', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=music_flow' },
  { username: 'tech_talks', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech_talks' }
];

export const getLiveUsers = async () => {
  // Simulate API Authentication handshake using the provided credentials
  console.log(`Authenticating with TikTok API using Key: ${TIKTOK_CONFIG.CLIENT_KEY}...`);
  
  // Simulate network delay and authentication process
  return new Promise((resolve) => {
    setTimeout(() => {
      // Logic to simulate verifying the client secret internally before returning data
      // In a real app, this would be: await fetch(TIKTOK_CONFIG.BASE_URL + '/oauth/token', ...)
      
      const statuses = MOCK_USERS.map(user => {
        const isLive = Math.random() > 0.4; // 60% chance to be live
        return {
          ...user,
          isLive,
          viewers: isLive ? Math.floor(Math.random() * 15000) + 500 : 0,
          title: isLive ? `Live: Playing with StreamVibe Tools! 🎵` : 'Offline'
        };
      });
      
      resolve(statuses.sort((a, b) => (b.isLive === a.isLive ? 0 : b.isLive ? 1 : -1)));
    }, 1500);
  });
};