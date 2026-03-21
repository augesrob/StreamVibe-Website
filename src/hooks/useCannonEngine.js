/**
 * useCannonEngine v10 — Ball Guys Cannon Mode
 * Pixel-accurate recreation based on actual gameplay screenshots
 *
 * Key mechanics from screenshots:
 * - Ball is a cannonball (dark sphere), not gummy bear
 * - Platform is a wooden fence rail in the middle of screen
 * - Numbered markers on rail act as physical speed bumps/barriers
 * - Green circles = normal markers, Pink/purple = current landing zone
 * - Reward boxes hang below the platform at each marker
 * - Sandy ground below, sky above
 * - Score top-left, multipliers top-left
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export const TICK_MS       = 16;
export const GRAVITY       = 9.8 * 2.5;   // wu/s² (world units)
export const FRICTION_AIR  = 0.999;
export const FRICTION_GND  = 0.96;        // strong friction when rolling
export const BOUNCE_COEFF  = 0.32;        // bounciness on platform hit
export const BUMP_SLOW     = 0.55;        // speed multiplier when hitting a marker bump
export const PX_PER_WU     = 10;          // pixels per world unit

// Chest multipliers from screenshot (Launch ×3, Bombs ×2, Power ×4)
export const CHEST_PICKS = [
  { id:'launch',  label:'Launch', icon:'🔫', color:'#e8c44a', mult:3, desc:'3× launch count' },
  { id:'bombs',   label:'Bombs',  icon:'💣', color:'#cc6622', mult:2, desc:'2× bombs'        },
  { id:'power',   label:'Power',  icon:'⭐', color:'#88cc22', mult:4, desc:'4× power'        },
];

// Gift tiers → charge fill
export const GIFT_TIERS = {
  tiny:   { label:'Rose',     color:'#ff88cc', fill:6,   push:2,  emoji:'🌹', coins:[1,4]          },
  small:  { label:'Gift',     color:'#00e5ff', fill:12,  push:5,  emoji:'💨', coins:[5,49]          },
  medium: { label:'Big Gift', color:'#ffd600', fill:25,  push:11, emoji:'⚡', coins:[50,499]         },
  large:  { label:'Super!',   color:'#ff6d00', fill:42,  push:20, emoji:'🔥', coins:[500,4999]       },
  mega:   { label:'MEGA!',    color:'#ff1744', fill:75,  push:35, emoji:'💥', coins:[5000,49999]     },
  ultra:  { label:'ULTRA!',   color:'#ea80fc', fill:100, push:55, emoji:'🌟', coins:[50000,Infinity] },
};
export function getGiftTier(coins) {
  for (const [id,t] of Object.entries(GIFT_TIERS))
    if (coins >= t.coins[0] && coins <= t.coins[1]) return { id, ...t };
  return { id:'tiny', ...GIFT_TIERS.tiny };
}

// Reward box types (from screenshot: diamond purple, gold coin, t-shirt)
const REWARD_POOL = [
  { type:'diamond', label:'20',   color:'#9933ff', icon:'💎' },
  { type:'diamond', label:'10',   color:'#9933ff', icon:'💎' },
  { type:'coin',    label:'$5',   color:'#ddaa00', icon:'$'  },
  { type:'coin',    label:'$10',  color:'#ddaa00', icon:'$'  },
  { type:'coin',    label:'$80',  color:'#ddaa00', icon:'$'  },
  { type:'coin',    label:'$120', color:'#ddaa00', icon:'$'  },
  { type:'coin',    label:'$145', color:'#ddaa00', icon:'$'  },
  { type:'coin',    label:'$200', color:'#ddaa00', icon:'$'  },
  { type:'coin',    label:'$380', color:'#ddaa00', icon:'$'  },
  { type:'skin',    label:'Common',color:'#44aaff', icon:'👕' },
];
function randReward() { return REWARD_POOL[Math.floor(Math.random()*REWARD_POOL.length)]; }

// Build marker array — each is a physical bump on the platform
function buildMarkers(count = 200) {
  return Array.from({ length: count }, (_, i) => ({
    num:    i + 1,
    wx:     (i + 1) * 10,   // 10 world units apart
    reward: randReward(),
    hit:    false,           // has ball passed over this?
  }));
}

export function useCannonEngine() {
  // ── Phases ────────────────────────────────────────────────────────────
  // idle → chest_pick → tap_to_shoot → flying → rolling → landed
  const [phase,       setPhase]       = useState('idle');
  const [chestsDone,  setChestsDone]  = useState(false);
  const [multipliers, setMultipliers] = useState({ launch:1, bombs:1, power:1 });

  // ── Ball physics (world coords) ───────────────────────────────────────
  const [ballX,       setBallX]       = useState(0);
  const [ballY,       setBallY]       = useState(0);   // 0 = on platform surface
  const [ballRot,     setBallRot]     = useState(0);
  const [ballUser,    setBallUser]    = useState(null);
  const [camX,        setCamX]        = useState(0);   // camera world-x

  // ── Charge ────────────────────────────────────────────────────────────
  const [chargeLevel, setChargeLevel] = useState(0);   // 0–100

  // ── Score / markers ───────────────────────────────────────────────────
  const [score,       setScore]       = useState(0);
  const [bestScore,   setBestScore]   = useState(0);
  const [rewardLabel, setRewardLabel] = useState('Fair');
  const [markers,     setMarkers]     = useState([]);
  const [currentMark, setCurrentMark] = useState(0);   // current marker number ball is near

  // ── Auction / gifts ───────────────────────────────────────────────────
  const [auctionBids,   setAuctionBids]   = useState({});
  const [auctionWinner, setAuctionWinner] = useState(null);
  const [showChestPick, setShowChestPick] = useState(false);
  const [chestsRemain,  setChestsRemain]  = useState(3);   // player picks 3 chests
  const [pickedChests,  setPickedChests]  = useState([]);
  const [recentGifts,   setRecentGifts]   = useState([]);
  const [activeBoost,   setActiveBoost]   = useState(null);
  const [leaderboard,   setLeaderboard]   = useState([]);
  const [roundCount,    setRoundCount]    = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────
  const phaseRef   = useRef('idle');
  const vxRef      = useRef(0);
  const vyRef      = useRef(0);
  const bxRef      = useRef(0);
  const byRef      = useRef(0);
  const rotRef     = useRef(0);
  const camRef     = useRef(0);
  const chargeRef  = useRef(0);
  const markersRef = useRef([]);
  const tickRef    = useRef(null);
  const userRef    = useRef(null);
  const multRef    = useRef({ launch:1, bombs:1, power:1 });

  const syncPhase = p => { phaseRef.current = p; setPhase(p); };

  // ── Auction ───────────────────────────────────────────────────────────
  const startAuction = useCallback(() => {
    setAuctionBids({});
    setAuctionWinner(null);
    setShowChestPick(false);
    setPickedChests([]);
    setChestsRemain(3);
    setMultipliers({ launch:1, bombs:1, power:1 });
    multRef.current = { launch:1, bombs:1, power:1 };
    syncPhase('auction');
  }, []);

  const endAuction = useCallback(() => {
    setAuctionBids(prev => {
      const entries = Object.entries(prev).sort((a,b) => b[1]-a[1]);
      if (entries.length > 0) {
        setAuctionWinner({ user: entries[0][0], coins: entries[0][1] });
      }
      setShowChestPick(true);
      syncPhase('chest_pick');
      return prev;
    });
  }, []);

  const pickChest = useCallback((chestId) => {
    const chest = CHEST_PICKS.find(c => c.id === chestId);
    if (!chest) return;
    setPickedChests(prev => [...prev, chestId]);
    setMultipliers(prev => {
      const next = { ...prev, [chestId]: chest.mult };
      multRef.current = next;
      return next;
    });
    setChestsRemain(prev => {
      const remaining = prev - 1;
      if (remaining <= 0) {
        setShowChestPick(false);
        syncPhase('tap_to_shoot');
      }
      return remaining;
    });
  }, []);

  // ── Gift processing ───────────────────────────────────────────────────
  const processGift = useCallback((username, coins) => {
    const tier = getGiftTier(coins);
    // Auction bids
    if (phaseRef.current === 'auction') {
      setAuctionBids(prev => ({ ...prev, [username]: (prev[username]||0) + coins }));
    }
    // Gift feed
    setRecentGifts(prev => [{ user:username, tier, ts:Date.now() }, ...prev.slice(0,6)]);
    // Charge during tap_to_shoot
    if (phaseRef.current === 'tap_to_shoot') {
      chargeRef.current = Math.min(100, chargeRef.current + tier.fill);
      setChargeLevel(chargeRef.current);
      if (chargeRef.current >= 100) setTimeout(() => shoot(username), 300);
    }
    // Push during flight
    if (phaseRef.current === 'flying' || phaseRef.current === 'rolling') {
      vxRef.current += tier.push * 0.3 * (multRef.current.power || 1);
      userRef.current = username;
      setBallUser(username);
      setActiveBoost({ emoji: tier.emoji, label: `@${username} ${tier.label}`, color: tier.color });
      setTimeout(() => setActiveBoost(null), 2500);
    }
  }, []);

  // ── Shoot ─────────────────────────────────────────────────────────────
  const shoot = useCallback((username) => {
    if (phaseRef.current !== 'tap_to_shoot' && phaseRef.current !== 'flying') return;
    const m = multRef.current;
    const chargePct = Math.max(0.3, chargeRef.current / 100);
    const basePow = 55 * chargePct * (m.power || 1);
    const angle = 38 * Math.PI / 180;
    vxRef.current = basePow * Math.cos(angle);
    vyRef.current = basePow * Math.sin(angle);
    bxRef.current = 0;
    byRef.current = 0;
    rotRef.current = 0;
    camRef.current = 0;
    if (username) { userRef.current = username; setBallUser(username); }
    syncPhase('flying');
    chargeRef.current = 0;
    setChargeLevel(0);
    setBallX(0); setBallY(0); setBallRot(0); setCamX(0);
    // Reset markers hit state
    markersRef.current = markersRef.current.map(m => ({ ...m, hit: false }));
    startPhysics();
  }, []);

  const tapToShoot = useCallback(() => {
    if (phaseRef.current === 'tap_to_shoot') shoot(null);
  }, [shoot]);

  // ── Physics tick ──────────────────────────────────────────────────────
  const startPhysics = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    const DT = TICK_MS / 1000;

    tickRef.current = setInterval(() => {
      const ph = phaseRef.current;
      if (ph !== 'flying' && ph !== 'rolling') { clearInterval(tickRef.current); return; }

      let vx = vxRef.current;
      let vy = vyRef.current;
      let bx = bxRef.current;
      let by = byRef.current;
      let rot = rotRef.current;

      // Gravity (only when above platform)
      if (by > 0 || vy > 0) vy -= GRAVITY * DT;

      // Platform collision (by = 0 is platform surface)
      if (by + vy * DT <= 0) {
        by = 0;
        if (Math.abs(vy) > 3) {
          vy = Math.abs(vy) * BOUNCE_COEFF;
          vx *= 0.88;
        } else {
          vy = 0;
          if (ph === 'flying') syncPhase('rolling');
        }
      }

      // Marker bump physics — each numbered circle acts as a speed bump
      const markers = markersRef.current;
      let hitAny = false;
      for (let i = 0; i < markers.length; i++) {
        const mk = markers[i];
        if (mk.hit) continue;
        const dx = bx - mk.wx;
        if (Math.abs(dx) < 1.8 && by <= 1.5) {
          // Ball hit this marker — slow it down significantly
          vx *= BUMP_SLOW;
          if (vx < 0.5) vx = 0;
          // Small upward kick from bump
          if (by <= 0.5) vy = Math.max(vy, 4);
          markers[i] = { ...mk, hit: true };
          hitAny = true;
          setCurrentMark(mk.num);
          break;
        }
      }
      if (hitAny) {
        markersRef.current = [...markers];
        setMarkers([...markers]);
      }

      // Rolling friction
      if (ph === 'rolling') {
        vx *= FRICTION_GND;
        by = 0; vy = 0;
      }

      // Horizontal air resistance
      if (ph === 'flying') vx *= FRICTION_AIR;

      // Rotation
      rot += vx * 15 * DT;

      bx += vx * DT;
      by += vy * DT;
      if (by < 0) by = 0;

      // Camera: keep ball ~200px right of cannon on screen
      // PX_PER_WU matches MARKER_STEP/10 = 8.5px per world unit
      const CAM_LEAD = 200 / 8.5;  // world units ahead of cannon to show
      const targetCam = Math.max(0, bx - CAM_LEAD);
      camRef.current += (targetCam - camRef.current) * 0.07;

      vxRef.current = vx; vyRef.current = vy;
      bxRef.current = bx; byRef.current = by; rotRef.current = rot;

      const sc = Math.round(bx);
      setBallX(parseFloat(bx.toFixed(2)));
      setBallY(parseFloat(by.toFixed(2)));
      setBallRot(parseFloat(rot.toFixed(1)));
      setCamX(parseFloat(camRef.current.toFixed(2)));
      setScore(sc);
      if (sc > 100) setRewardLabel('Good');
      else if (sc > 50) setRewardLabel('Fair');
      else setRewardLabel('Poor');

      // Stop condition
      if (ph === 'rolling' && Math.abs(vx) < 0.15) {
        clearInterval(tickRef.current);
        const finalScore = sc;
        setBestScore(prev => Math.max(prev, finalScore));
        setLeaderboard(prev => {
          const e = { user: userRef.current ?? 'viewer', score: finalScore, ts: Date.now() };
          return [e, ...prev].sort((a,b)=>b.score-a.score).slice(0,10);
        });
        syncPhase('landed');
        setTimeout(() => resetRound(), 5000);
      }
    }, TICK_MS);
  };

  const resetRound = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    vxRef.current = 0; vyRef.current = 0;
    bxRef.current = 0; byRef.current = 0;
    camRef.current = 0; rotRef.current = 0;
    setBallX(0); setBallY(0); setBallRot(0); setCamX(0);
    setScore(0); setCurrentMark(0);
    setMultipliers({ launch:1, bombs:1, power:1 });
    multRef.current = { launch:1, bombs:1, power:1 };
    chargeRef.current = 0; setChargeLevel(0);
    setBallUser(null); userRef.current = null;
    setRoundCount(p => p+1);
    syncPhase('idle');
  }, []);

  const startNewRound = useCallback(() => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'landed') return;
    resetRound();
    setTimeout(() => startAuction(), 100);
  }, [resetRound, startAuction]);

  // Init markers once
  useEffect(() => {
    const m = buildMarkers(300);
    markersRef.current = m;
    setMarkers(m);
  }, []);

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  return {
    phase, multipliers, chargeLevel, ballX, ballY, ballRot, ballUser,
    camX, score, bestScore, rewardLabel, markers, currentMark,
    auctionBids, auctionWinner, showChestPick, chestsRemain, pickedChests,
    recentGifts, activeBoost, leaderboard, roundCount, chestsDone,
    // actions
    processGift, startAuction, endAuction, pickChest,
    shoot, tapToShoot, startNewRound, resetRound,
  };
}
