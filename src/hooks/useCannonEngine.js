/**
 * useCannonEngine v13
 * Fixes:
 * 1. Markers sit ON TOP of rail (not half-buried)
 * 2. Bombs and bouncers placed as DOM objects on platform after chest pick
 * 3. Chest grid = 9 mystery chests, clicking reveals random boost
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export const TICK_MS      = 16;
export const GRAVITY      = 9.8 * 2.4;
export const FRICTION_AIR = 0.999;
export const FRICTION_GND = 0.965;
export const BOUNCE_COEFF = 0.3;
export const BUMP_SLOW    = 0.58;   // speed after hitting marker
export const MARKER_SPACING_WU = 10; // world units between markers

// What each chest can contain — randomised per pick
export const CHEST_REWARDS = [
  { id:'power3',  label:'Power',   icon:'⭐', color:'#ffdd00', mult:{ power:3 }, desc:'3× launch power'  },
  { id:'power4',  label:'Power',   icon:'⭐', color:'#ffaa00', mult:{ power:4 }, desc:'4× launch power'  },
  { id:'bombs2',  label:'Bombs',   icon:'💣', color:'#ff4422', mult:{ bombs:2 }, desc:'2× bombs on field' },
  { id:'bombs4',  label:'Bombs',   icon:'💣', color:'#cc2200', mult:{ bombs:4 }, desc:'4× bombs on field' },
  { id:'bounce2', label:'Springs', icon:'🟡', color:'#ffaa00', mult:{ bounce:2}, desc:'2× springs'        },
  { id:'bounce4', label:'Springs', icon:'🟡', color:'#ff8800', mult:{ bounce:4}, desc:'4× springs'        },
  { id:'launch3', label:'Launch',  icon:'🔫', color:'#44aaff', mult:{ launch:3}, desc:'3× launches'       },
];

// Legacy CHEST_PICKS for sign display (still shows 3 possible types)
export const CHEST_PICKS = [
  { id:'launch',  label:'Launch', icon:'🔫', color:'#e8c44a', mult:3, desc:'3× launch count' },
  { id:'bombs',   label:'Bombs',  icon:'💣', color:'#cc6622', mult:2, desc:'2× bombs'        },
  { id:'power',   label:'Power',  icon:'⭐', color:'#88cc22', mult:4, desc:'4× power'        },
];

export const GIFT_TIERS = {
  tiny:   { label:'Rose',     color:'#ff88cc', fill:6,   push:2,  emoji:'🌹', coins:[1,4]           },
  small:  { label:'Gift',     color:'#00e5ff', fill:12,  push:5,  emoji:'💨', coins:[5,49]           },
  medium: { label:'Big Gift', color:'#ffd600', fill:25,  push:11, emoji:'⚡', coins:[50,499]          },
  large:  { label:'Super!',   color:'#ff6d00', fill:42,  push:20, emoji:'🔥', coins:[500,4999]        },
  mega:   { label:'MEGA!',    color:'#ff1744', fill:75,  push:35, emoji:'💥', coins:[5000,49999]      },
  ultra:  { label:'ULTRA!',   color:'#ea80fc', fill:100, push:55, emoji:'🌟', coins:[50000,Infinity]  },
};
export function getGiftTier(coins) {
  for (const [id,t] of Object.entries(GIFT_TIERS))
    if (coins >= t.coins[0] && coins <= t.coins[1]) return { id, ...t };
  return { id:'tiny', ...GIFT_TIERS.tiny };
}

// Reward boxes on platform markers
const REWARD_POOL = [
  { type:'diamond', label:'20',    bg:'#9922ee', border:'#7700cc', icon:'💎', textCol:'#fff'   },
  { type:'coin',    label:'$5',    bg:'#f8f8ee', border:'#ccaa00', icon:'$',  textCol:'#885500'},
  { type:'coin',    label:'$10',   bg:'#f8f8ee', border:'#ccaa00', icon:'$',  textCol:'#885500'},
  { type:'diamond', label:'10',    bg:'#9922ee', border:'#7700cc', icon:'💎', textCol:'#fff'   },
  { type:'coin',    label:'$80',   bg:'#f8f8ee', border:'#ccaa00', icon:'$',  textCol:'#885500'},
  { type:'skin',    label:'Common',bg:'#eef0ff', border:'#8899cc', icon:'👕', textCol:'#334'   },
  { type:'coin',    label:'$200',  bg:'#f8f8ee', border:'#ccaa00', icon:'$',  textCol:'#885500'},
  { type:'coin',    label:'$380',  bg:'#f8f8ee', border:'#ccaa00', icon:'$',  textCol:'#885500'},
];
function getRewardForMarker(n) { return REWARD_POOL[n % REWARD_POOL.length]; }

// Build platform objects: bombs + bouncers placed at world positions
function buildPlatformObjects(bombCount, bounceCount) {
  const objs = [];
  // Bombs spaced along platform
  const bombPositions = [15, 28, 42, 60, 78, 95, 115, 135, 158, 182, 210, 240];
  for (let i = 0; i < Math.min(bombCount, bombPositions.length); i++) {
    objs.push({ id:`bomb_${i}`, type:'bomb', worldX: bombPositions[i], active: true });
  }
  // Bouncers between bombs
  const bouncePositions = [22, 35, 50, 68, 88, 108, 130, 155, 180, 208];
  for (let i = 0; i < Math.min(bounceCount, bouncePositions.length); i++) {
    objs.push({ id:`bounce_${i}`, type:'bouncer', worldX: bouncePositions[i], active: true });
  }
  return objs;
}

// Pre-generate markers (200 of them)
export const MARKERS = Array.from({ length: 200 }, (_, i) => ({
  num:    i + 1,
  worldX: (i + 1) * MARKER_SPACING_WU,
  reward: getRewardForMarker(i + 1),
}));

export function useCannonEngine() {
  const [phase,        setPhase]        = useState('idle');
  const [multipliers,  setMultipliers]  = useState({ launch:1, bombs:0, bounce:0, power:1 });
  const [chargeLevel,  setChargeLevel]  = useState(0);
  const [ballX,        setBallX]        = useState(0);
  const [ballY,        setBallY]        = useState(0);
  const [ballRot,      setBallRot]      = useState(0);
  const [ballUser,     setBallUser]     = useState(null);
  const [camX,         setCamX]         = useState(0);
  const [score,        setScore]        = useState(0);
  const [bestScore,    setBestScore]    = useState(0);
  const [rewardLabel,  setRewardLabel]  = useState('Poor');
  const [currentMark,  setCurrentMark]  = useState(0);
  const [platObjects,  setPlatObjects]  = useState([]); // bombs + bouncers on platform
  const [auctionBids,  setAuctionBids]  = useState({});
  const [auctionWinner,setAuctionWinner]= useState(null);
  const [showChestPick,setShowChestPick]= useState(false);
  const [chestsRemain, setChestsRemain] = useState(3);
  const [pickedChests, setPickedChests] = useState([]); // array of { icon, label, color }
  const [recentGifts,  setRecentGifts]  = useState([]);
  const [activeBoost,  setActiveBoost]  = useState(null);
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [roundCount,   setRoundCount]   = useState(0);

  const phaseRef   = useRef('idle');
  const vxRef      = useRef(0);
  const vyRef      = useRef(0);
  const bxRef      = useRef(0);
  const byRef      = useRef(0);
  const rotRef     = useRef(0);
  const camRef     = useRef(0);
  const chargeRef  = useRef(0);
  const markHitRef = useRef(new Set()); // marker numbers already hit
  const objsRef    = useRef([]);
  const tickRef    = useRef(null);
  const userRef    = useRef(null);
  const multRef    = useRef({ launch:1, bombs:0, bounce:0, power:1 });

  const syncPhase = p => { phaseRef.current = p; setPhase(p); };

  // ── Auction ────────────────────────────────────────────────────────────
  const startAuction = useCallback(() => {
    setAuctionBids({}); setAuctionWinner(null);
    setShowChestPick(false); setPickedChests([]); setChestsRemain(3);
    setMultipliers({ launch:1, bombs:0, bounce:0, power:1 });
    multRef.current = { launch:1, bombs:0, bounce:0, power:1 };
    setPlatObjects([]); objsRef.current = [];
    syncPhase('auction');
  }, []);

  const endAuction = useCallback(() => {
    setAuctionBids(prev => {
      const entries = Object.entries(prev).sort((a,b) => b[1]-a[1]);
      if (entries.length > 0) setAuctionWinner({ user: entries[0][0], coins: entries[0][1] });
      setShowChestPick(true);
      syncPhase('chest_pick');
      return prev;
    });
  }, []);

  // Pick a chest — each is a mystery, reveals a random CHEST_REWARD
  const pickChest = useCallback((slotIndex) => {
    if (phaseRef.current !== 'chest_pick') return;
    // Pick random reward not already picked
    const allIds = CHEST_REWARDS.map(r => r.id);
    const picked = pickedChests.map(p => p.id);
    const available = CHEST_REWARDS.filter(r => !picked.includes(r.id));
    const reward = available[Math.floor(Math.random() * available.length)];
    if (!reward) return;

    const newPicked = [...pickedChests, reward];
    setPickedChests(newPicked);

    // Apply multiplier
    setMultipliers(prev => {
      const next = { ...prev };
      Object.entries(reward.mult).forEach(([k, v]) => { next[k] = (next[k]||0) + v; });
      multRef.current = next;
      return next;
    });

    const remaining = chestsRemain - 1;
    setChestsRemain(remaining);

    if (remaining <= 0) {
      setShowChestPick(false);
      // Build platform objects based on final multipliers
      const m = multRef.current;
      const objs = buildPlatformObjects(m.bombs || 0, m.bounce || 0);
      objsRef.current = objs;
      setPlatObjects(objs);
      syncPhase('tap_to_shoot');
    }
  }, [pickedChests, chestsRemain]);

  // ── Gift processing ────────────────────────────────────────────────────
  const processGift = useCallback((username, coins) => {
    const tier = getGiftTier(coins);
    if (phaseRef.current === 'auction') {
      setAuctionBids(prev => ({ ...prev, [username]: (prev[username]||0) + coins }));
    }
    setRecentGifts(prev => [{ user:username, tier, ts:Date.now() }, ...prev.slice(0,6)]);
    if (phaseRef.current === 'tap_to_shoot') {
      chargeRef.current = Math.min(100, chargeRef.current + tier.fill);
      setChargeLevel(chargeRef.current);
      if (chargeRef.current >= 100) setTimeout(() => shoot(username), 300);
    }
    if (phaseRef.current === 'flying' || phaseRef.current === 'rolling') {
      vxRef.current += tier.push * 0.28 * Math.max(1, multRef.current.power || 1);
      userRef.current = username; setBallUser(username);
      setActiveBoost({ emoji: tier.emoji, label:`@${username} ${tier.label}`, color: tier.color });
      setTimeout(() => setActiveBoost(null), 2500);
    }
  }, []);

  // ── Shoot ──────────────────────────────────────────────────────────────
  const shoot = useCallback((username) => {
    if (phaseRef.current !== 'tap_to_shoot') return;
    const m = multRef.current;
    const pct = Math.max(0.3, chargeRef.current / 100);
    const spd = 52 * pct * Math.max(1, m.power || 1);
    const ang = 40 * Math.PI / 180;
    vxRef.current = spd * Math.cos(ang);
    vyRef.current = spd * Math.sin(ang);
    bxRef.current = 0; byRef.current = 0; rotRef.current = 0; camRef.current = 0;
    markHitRef.current = new Set();
    if (username) { userRef.current = username; setBallUser(username); }
    syncPhase('flying');
    chargeRef.current = 0; setChargeLevel(0);
    setBallX(0); setBallY(0); setBallRot(0); setCamX(0);
    startPhysics();
  }, []);

  const tapToShoot = useCallback(() => {
    if (phaseRef.current === 'tap_to_shoot') shoot(null);
  }, [shoot]);

  // ── Physics tick ────────────────────────────────────────────────────────
  const startPhysics = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    const DT = TICK_MS / 1000;

    tickRef.current = setInterval(() => {
      const ph = phaseRef.current;
      if (ph !== 'flying' && ph !== 'rolling') { clearInterval(tickRef.current); return; }

      let vx = vxRef.current, vy = vyRef.current;
      let bx = bxRef.current, by = byRef.current;
      let rot = rotRef.current;

      // Gravity
      if (by > 0 || vy > 0) vy -= GRAVITY * DT;

      // Platform hit
      if (by + vy * DT <= 0) {
        by = 0;
        if (Math.abs(vy) > 3) { vy = Math.abs(vy) * BOUNCE_COEFF; vx *= 0.88; }
        else { vy = 0; if (ph === 'flying') syncPhase('rolling'); }
      }

      // ── Marker speed bumps ──
      const hitSet = markHitRef.current;
      for (const mk of MARKERS) {
        if (hitSet.has(mk.num)) continue;
        if (bx >= mk.worldX - 1.5 && bx <= mk.worldX + 1.5 && by <= 1.5) {
          vx *= BUMP_SLOW;
          if (vx < 0.3) vx = 0;
          if (by <= 0.4) vy = Math.max(vy, 3.5); // small hop over bump
          hitSet.add(mk.num);
          setCurrentMark(mk.num);
          break;
        }
      }

      // ── Platform objects (bombs + bouncers) ──
      const objs = objsRef.current;
      let newObjs = null;
      for (let i = 0; i < objs.length; i++) {
        const o = objs[i];
        if (!o.active) continue;
        if (Math.abs(bx - o.worldX) < 2.0 && by <= 2.0) {
          if (o.type === 'bomb') {
            // Bomb: big forward push + upward blast
            vx += 18; vy = Math.max(vy, 14);
            setActiveBoost({ emoji:'💥', label:'BOMB BLAST!', color:'#ff4400' });
            setTimeout(() => setActiveBoost(null), 1500);
          } else {
            // Bouncer: launch ball upward
            vy = Math.max(vy, 20); vx += 3;
            setActiveBoost({ emoji:'🟡', label:'SPRING BOOST!', color:'#ffaa00' });
            setTimeout(() => setActiveBoost(null), 1500);
          }
          if (!newObjs) newObjs = [...objs];
          newObjs[i] = { ...o, active: false };
          break;
        }
      }
      if (newObjs) { objsRef.current = newObjs; setPlatObjects(newObjs); }

      // Rolling friction
      if (ph === 'rolling') { vx *= FRICTION_GND; by = 0; vy = 0; }
      if (ph === 'flying') vx *= FRICTION_AIR;

      rot += vx * 15 * DT;
      bx += vx * DT; by += vy * DT;
      if (by < 0) by = 0;

      // Camera — keep ball ~250px from cannon edge
      const CAM_LEAD = 250 / 8.5;
      const targetCam = Math.max(0, bx - CAM_LEAD);
      camRef.current += (targetCam - camRef.current) * 0.08;

      vxRef.current = vx; vyRef.current = vy;
      bxRef.current = bx; byRef.current = by; rotRef.current = rot;

      const sc = Math.round(bx);
      setBallX(parseFloat(bx.toFixed(2))); setBallY(parseFloat(by.toFixed(2)));
      setBallRot(parseFloat(rot.toFixed(1))); setCamX(parseFloat(camRef.current.toFixed(2)));
      setScore(sc);
      setRewardLabel(sc > 100 ? 'Good' : sc > 50 ? 'Fair' : 'Poor');

      // Stop
      if (ph === 'rolling' && Math.abs(vx) < 0.12) {
        clearInterval(tickRef.current);
        setBestScore(p => Math.max(p, sc));
        setLeaderboard(p => [{ user: userRef.current??'viewer', score:sc, ts:Date.now() }, ...p]
          .sort((a,b)=>b.score-a.score).slice(0,10));
        syncPhase('landed');
        setTimeout(() => resetRound(), 5000);
      }
    }, TICK_MS);
  };

  const resetRound = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    vxRef.current=0; vyRef.current=0; bxRef.current=0; byRef.current=0;
    camRef.current=0; rotRef.current=0; markHitRef.current=new Set();
    setBallX(0); setBallY(0); setBallRot(0); setCamX(0);
    setScore(0); setCurrentMark(0); setRewardLabel('Poor');
    setMultipliers({ launch:1, bombs:0, bounce:0, power:1 });
    multRef.current = { launch:1, bombs:0, bounce:0, power:1 };
    chargeRef.current=0; setChargeLevel(0);
    setBallUser(null); userRef.current=null;
    setPlatObjects([]); objsRef.current=[];
    setRoundCount(p => p+1);
    syncPhase('idle');
  }, []);

  const startNewRound = useCallback(() => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'landed') return;
    resetRound();
    setTimeout(() => startAuction(), 80);
  }, [resetRound, startAuction]);

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  return {
    phase, multipliers, chargeLevel, ballX, ballY, ballRot, ballUser,
    camX, score, bestScore, rewardLabel, currentMark, platObjects,
    auctionBids, auctionWinner, showChestPick, chestsRemain, pickedChests,
    recentGifts, activeBoost, leaderboard, roundCount,
    processGift, startAuction, endAuction, pickChest,
    shoot, tapToShoot, startNewRound, resetRound,
  };
}
