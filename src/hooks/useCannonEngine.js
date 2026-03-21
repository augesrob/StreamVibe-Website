/**
 * useCannonEngine v9 — Ball Guys: Cannon Mode
 * - Gummy bear ball with username floating above
 * - TikTok gifts auto-charge cannon
 * - Auction/highest gifter picks chest for boost
 * - Supabase Realtime broadcast for overlay
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export const PX_PER_WU    = 9;
export const GRAVITY_WU   = 10.5;
export const FRICTION_GND = 0.982;
export const BOUNCE_REST  = 0.28;
export const TICK_MS      = 16;
const CAM_LERP_X          = 0.07;
const CAM_LEAD_WU         = 14;

export const CHARGE_MAX       = 100;
export const CHARGE_THRESHOLD = 25;

const LAUNCH_POWER_BASE = 52;
const LAUNCH_ANGLE_DEG  = 40;
const LAUNCH_RAD        = (LAUNCH_ANGLE_DEG * Math.PI) / 180;

// Floor zones — colour + multiplier
export const FLOOR_ZONES = [
  { minWx:0,   label:'1×', mult:1, color:'#22cc44' },
  { minWx:40,  label:'2×', mult:2, color:'#44ccaa' },
  { minWx:80,  label:'3×', mult:3, color:'#44aacc' },
  { minWx:130, label:'4×', mult:4, color:'#6644cc' },
  { minWx:180, label:'5×', mult:5, color:'#cc44aa' },
];

// Chest types for auction winner to pick
export const CHEST_TYPES = [
  { id:'power',   emoji:'⚡', label:'Power Boost',   color:'#ffd600',
    desc:'+80% launch power', applyFn: m => ({ ...m, power: (m.power||1) * 1.8 }) },
  { id:'bombs',   emoji:'💣', label:'Bomb Field',    color:'#ff4444',
    desc:'6 bombs on field',  applyFn: m => ({ ...m, bomb: (m.bomb||0) + 6   }) },
  { id:'springs', emoji:'🟡', label:'Spring Park',   color:'#ffaa00',
    desc:'5 springs on field',applyFn: m => ({ ...m, bouncer: (m.bouncer||0) + 5 }) },
  { id:'lucky',   emoji:'🍀', label:'Lucky Shot',    color:'#44ff88',
    desc:'Random mega boost', applyFn: m => ({ ...m, power: (m.power||1) * 2.5 }) },
];

// Gift tiers → charge amounts
export const GIFT_TIERS = {
  rose:    { label:'Rose',     color:'#ff88cc', chargeAdd:8,   force:3,  emoji:'🌹', coins:[1,4]            },
  small:   { label:'Charge+',  color:'#00e5ff', chargeAdd:14,  force:5,  emoji:'💨', coins:[5,49]           },
  medium:  { label:'Big!',     color:'#ffd600', chargeAdd:26,  force:12, emoji:'⚡', coins:[50,499]          },
  large:   { label:'Super!',   color:'#ff6d00', chargeAdd:42,  force:20, emoji:'🔥', coins:[500,4999]        },
  mega:    { label:'MEGA!',    color:'#ff1744', chargeAdd:75,  force:35, emoji:'💥', coins:[5000,49999]      },
  ultra:   { label:'ULTRA!',   color:'#ea80fc', chargeAdd:999, force:55, emoji:'🌟', coins:[50000,Infinity]  },
};
export function getGiftTier(coins) {
  for (const [id,t] of Object.entries(GIFT_TIERS))
    if (coins >= t.coins[0] && coins <= t.coins[1]) return { id, ...t };
  return { id:'rose', ...GIFT_TIERS.rose };
}

function buildObstacles(bombCount, bouncerCount) {
  const obs = []; let id = 0;
  const bombPos    = [20,36,52,70,88,108,128,150,172,196];
  const bouncePos  = [28,46,64,84,106,130,156,182];
  for (let i=0; i<Math.min(bombCount, bombPos.length); i++)
    obs.push({ id:id++, type:'bomb',    wx:bombPos[i], wy:0, r:2.2, active:true });
  for (let i=0; i<Math.min(bouncerCount, bouncePos.length); i++)
    obs.push({ id:id++, type:'bouncer', wx:bouncePos[i], wy:0, r:1.8, active:true });
  return obs;
}

function getFloorZone(wx) {
  let zone = FLOOR_ZONES[0];
  for (const z of FLOOR_ZONES) { if (wx >= z.minWx) zone = z; else break; }
  return zone;
}

export function useCannonEngine() {
  // ── Core phase / state ───────────────────────────────────────────────
  const [phase,        setPhase]        = useState('idle');
  const [multipliers,  setMultipliers]  = useState({ power:1, bomb:0, bouncer:0 });
  const [chargeLevel,  setChargeLevel]  = useState(0);
  const [ballWx,       setBallWx]       = useState(0);
  const [ballWy,       setBallWy]       = useState(0);
  const [ballRot,      setBallRot]      = useState(0);
  const [ballUser,     setBallUser]     = useState(null);  // TikTok username on ball
  const [camWx,        setCamWx]        = useState(0);
  const [currentDist,  setCurrentDist]  = useState(0);
  const [finalScore,   setFinalScore]   = useState(0);
  const [bestScore,    setBestScore]    = useState(0);
  const [floorZone,    setFloorZone]    = useState(FLOOR_ZONES[0]);
  const [obstacles,    setObstacles]    = useState([]);
  const [activeBoost,  setActiveBoost]  = useState(null);
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [roundCount,   setRoundCount]   = useState(0);

  // ── Auction / gifter tracking ─────────────────────────────────────────
  const [auctionPhase,  setAuctionPhase]  = useState(false);  // true = collecting bids
  const [auctionBids,   setAuctionBids]   = useState({});     // { username: totalCoins }
  const [auctionWinner, setAuctionWinner] = useState(null);   // { user, coins }
  const [showChestPick, setShowChestPick] = useState(false);  // winner is picking
  const [recentGifts,   setRecentGifts]   = useState([]);     // last 8 gifts for feed

  // ── Physics refs ─────────────────────────────────────────────────────
  const vxRef      = useRef(0);
  const vyRef      = useRef(0);
  const phaseRef   = useRef('idle');
  const tickRef    = useRef(null);
  const obsRef     = useRef([]);
  const chargeRef  = useRef(0);
  const multRef    = useRef({ power:1, bomb:0, bouncer:0 });

  const syncPhase = (p) => { phaseRef.current = p; setPhase(p); };

  // ── Start auction (streamer triggers or auto at round start) ──────────
  const startAuction = useCallback(() => {
    setAuctionPhase(true);
    setAuctionBids({});
    setAuctionWinner(null);
    setShowChestPick(false);
    syncPhase('auction');
  }, []);

  // ── End auction, pick winner ──────────────────────────────────────────
  const endAuction = useCallback(() => {
    setAuctionBids(prev => {
      const entries = Object.entries(prev);
      if (entries.length === 0) {
        setAuctionPhase(false);
        syncPhase('charging');
        return prev;
      }
      entries.sort((a,b)=>b[1]-a[1]);
      const [user, coins] = entries[0];
      setAuctionWinner({ user, coins });
      setShowChestPick(true);
      setAuctionPhase(false);
      syncPhase('chest_pick');
      return prev;
    });
  }, []);

  // ── Winner picks a chest ──────────────────────────────────────────────
  const pickChest = useCallback((chestId) => {
    const chest = CHEST_TYPES.find(c => c.id === chestId);
    if (!chest) return;
    setMultipliers(prev => {
      const next = chest.applyFn(prev);
      multRef.current = next;
      return next;
    });
    setActiveBoost({ emoji: chest.emoji, label: chest.label, color: chest.color, user: auctionWinner?.user });
    setTimeout(() => setActiveBoost(null), 4000);
    setShowChestPick(false);
    syncPhase('charging');
  }, [auctionWinner]);

  // ── Process incoming TikTok gift ──────────────────────────────────────
  const processGift = useCallback((username, coins) => {
    const tier = getGiftTier(coins);

    // Add to auction bids if auction is open
    if (phaseRef.current === 'auction') {
      setAuctionBids(prev => ({ ...prev, [username]: (prev[username]||0) + coins }));
    }

    // Always add to recent gifts feed
    setRecentGifts(prev => [
      { user: username, tier, ts: Date.now() },
      ...prev.slice(0, 7)
    ]);

    // During charging: add to charge bar
    if (phaseRef.current === 'charging') {
      chargeRef.current = Math.min(CHARGE_MAX, chargeRef.current + tier.chargeAdd);
      setChargeLevel(chargeRef.current);
      // If full → auto-launch
      if (chargeRef.current >= CHARGE_MAX) {
        chargeRef.current = CHARGE_MAX;
        setChargeLevel(CHARGE_MAX);
        setTimeout(() => launch(username), 300);
      }
    }

    // During flight/rolling: forward boost
    if (phaseRef.current === 'in_flight' || phaseRef.current === 'rolling') {
      vxRef.current += tier.force * 0.4;
      setBallUser(username);
      setActiveBoost({ emoji: tier.emoji, label: `@${username} ${tier.label}`, color: tier.color });
      setTimeout(() => setActiveBoost(null), 2500);
    }
  }, []);

  // ── Launch the ball ──────────────────────────────────────────────────
  const launch = useCallback((username) => {
    if (phaseRef.current !== 'charging') return;
    const chargePct = chargeRef.current / CHARGE_MAX;
    const m = multRef.current;
    const spd = LAUNCH_POWER_BASE * chargePct * (m.power || 1);
    vxRef.current = spd * Math.cos(LAUNCH_RAD);
    vyRef.current = spd * Math.sin(LAUNCH_RAD);
    setBallWx(0); setBallWy(0); setBallRot(0);
    setCamWx(0);
    if (username) setBallUser(username);
    const obs = buildObstacles(m.bomb || 0, m.bouncer || 0);
    obsRef.current = obs;
    setObstacles(obs);
    syncPhase('in_flight');
    chargeRef.current = 0;
    setChargeLevel(0);
    startPhysics();
  }, []);

  const startPhysics = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    let wx = 0, wy = 0, rot = 0, camX = 0;
    const DT = TICK_MS / 1000;
    tickRef.current = setInterval(() => {
      const ph = phaseRef.current;
      if (ph !== 'in_flight' && ph !== 'rolling') {
        clearInterval(tickRef.current); return;
      }
      let vx = vxRef.current;
      let vy = vyRef.current;

      // Gravity
      vy -= GRAVITY_WU * DT;

      // Ground collision
      if (wy + vy * DT <= 0) {
        wy = 0;
        if (Math.abs(vy) > 2) {
          vy = -vy * BOUNCE_REST;
          vx *= 0.9;
        } else {
          vy = 0;
          wy = 0;
          if (ph === 'in_flight') syncPhase('rolling');
        }
      }

      // Obstacle collisions
      const newObs = [...obsRef.current];
      let obsHit = false;
      for (let i = 0; i < newObs.length; i++) {
        const o = newObs[i];
        if (!o.active) continue;
        const dx = wx - o.wx, dy = wy - o.wy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < o.r + 1.1) {
          if (o.type === 'bouncer') { vy = Math.abs(vy) * 1.8 + 8; vx += 2; }
          if (o.type === 'bomb')    { vx += 12; vy += 6; }
          newObs[i] = { ...o, active: false };
          obsHit = true;
        }
      }
      if (obsHit) { obsRef.current = newObs; setObstacles([...newObs]); }

      // Rolling friction
      if (ph === 'rolling') {
        vx *= FRICTION_GND;
        wy = 0; vy = 0;
        rot += vx * 18 * DT;
      } else {
        rot += vx * 8 * DT;
      }

      // Move
      wx += vx * DT;
      wy += vy * DT;
      if (wy < 0) wy = 0;

      // Camera
      const targetCam = Math.max(0, wx - CAM_LEAD_WU);
      camX += (targetCam - camX) * CAM_LERP_X;

      vxRef.current = vx; vyRef.current = vy;
      setBallWx(parseFloat(wx.toFixed(2)));
      setBallWy(parseFloat(wy.toFixed(2)));
      setBallRot(parseFloat(rot.toFixed(1)));
      setCamWx(parseFloat(camX.toFixed(2)));
      const dist = Math.round(wx);
      setCurrentDist(dist);
      setFloorZone(getFloorZone(wx));

      // Stop condition
      if (ph === 'rolling' && Math.abs(vx) < 0.3) {
        clearInterval(tickRef.current);
        const zone = getFloorZone(wx);
        const score = Math.round(wx * zone.mult * 10);
        setFinalScore(score);
        setBestScore(prev => Math.max(prev, score));
        setLeaderboard(prev => {
          const entry = { user: ballUserRef.current ?? 'viewer', dist: Math.round(wx), score, ts: Date.now() };
          return [entry, ...prev].sort((a,b)=>b.score-a.score).slice(0,10);
        });
        syncPhase('landed');
        setTimeout(() => resetRound(), 4000);
      }
    }, TICK_MS);
  };

  const ballUserRef = useRef(null);
  useEffect(() => { ballUserRef.current = ballUser; }, [ballUser]);

  const resetRound = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    vxRef.current = 0; vyRef.current = 0;
    setBallWx(0); setBallWy(0); setBallRot(0);
    setCamWx(0); setCurrentDist(0); setFloorZone(FLOOR_ZONES[0]);
    setObstacles([]); obsRef.current = [];
    setMultipliers({ power:1, bomb:0, bouncer:0 });
    multRef.current = { power:1, bomb:0, bouncer:0 };
    chargeRef.current = 0; setChargeLevel(0);
    setBallUser(null);
    setRoundCount(p => p + 1);
    syncPhase('idle');
  }, []);

  const startNewRound = useCallback(() => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'landed') return;
    setAuctionBids({});
    setAuctionWinner(null);
    setShowChestPick(false);
    chargeRef.current = 0; setChargeLevel(0);
    syncPhase('auction');
    setAuctionPhase(true);
  }, []);

  const manualLaunch = useCallback(() => {
    if (phaseRef.current === 'charging' && chargeRef.current >= CHARGE_THRESHOLD) {
      launch(null);
    }
  }, [launch]);

  const forceStartCharging = useCallback(() => {
    if (phaseRef.current === 'idle' || phaseRef.current === 'landed') {
      setAuctionBids({});
      setAuctionPhase(true);
      syncPhase('auction');
    }
  }, []);

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  return {
    // State
    phase, multipliers, chargeLevel, ballWx, ballWy, ballRot, ballUser,
    camWx, currentDist, finalScore, bestScore, floorZone,
    obstacles, activeBoost, leaderboard, roundCount,
    // Auction
    auctionPhase, auctionBids, auctionWinner, showChestPick, recentGifts,
    // Actions
    processGift, startAuction, endAuction, pickChest,
    launch, manualLaunch, startNewRound, resetRound, forceStartCharging,
  };
}
