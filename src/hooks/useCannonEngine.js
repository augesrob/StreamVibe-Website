/**
 * useCannonEngine v7 — Real Ball Guys mechanics (from decompile)
 *
 * REAL GAME FLOW (from global-metadata.dat):
 *   1. chest_pick   — Pick 3 chests → multipliers (launchPower, bombCount, bouncerCount)
 *   2. charging     — chargeBar fills from hold/gifts. launcherFuels = shots remaining.
 *   3. in_flight    — Ball arc (LaunchTrajectoryUI). Gravity pulls down. Gifts add mid-air boost.
 *   4. rolling      — Ball on flat platform rolls RIGHT. Hits bombs (forward push),
 *                     bouncers (upward deflect), power-ups (speed add).
 *   5. landed       — Ball stops. Score = wx * floorZoneMultiplier.
 *
 * COORDINATE SYSTEM: World Units (WU). 1 WU = 16px on canvas.
 *   wx = distance along flat ground (0 = cannon, rightward positive)
 *   wy = height above ground (0 = surface, up positive)
 *
 * TIKTOK GIFTS:
 *   charging phase  → fills chargeBar by tier amount
 *   in_flight phase → forward impulse (boost mid-air)
 *   rolling phase   → forward impulse on ball
 *   idle/landed     → auto-starts next round / adds launcherFuel
 *
 * OBSTACLES (on flat platform):
 *   bomb    — stationary. Ball hits → explosion: +fwd force, big visual
 *   bouncer — spring bumper. Ball hits → upward deflect, bounces off
 *   power   — speed pickup. Ball hits → +vx boost
 */
import { useState, useRef, useCallback, useEffect } from 'react';

// ── World constants ───────────────────────────────────────────────────────
export const PX_PER_WU   = 16;          // canvas pixels per world unit
export const GRAVITY_WU  = 18;          // wu/s² downward (tuned for feel)
export const FRICTION_GND= 0.988;       // rolling friction per tick
export const BOUNCE_REST = 0.35;        // ball bounce off ground
export const TICK_MS     = 16;
const CAM_LERP           = 0.1;
const CAM_LEAD_WU        = 10;

// Charge bar: 0–100. Fire threshold = chargeThreshold (40 by default).
export const CHARGE_MAX  = 100;
export const CHARGE_THRESHOLD = 30;     // min charge to fire (chargeThreshold)
const CHARGE_HOLD_RATE   = 18;          // units/s when holding manually
const CHARGE_DECAY_RATE  = 8;           // units/s decay when not holding

// launchPower_base — scaled by chest multiplier
const LAUNCH_POWER_BASE  = 38;          // wu/s at 100% charge
const LAUNCH_ANGLE_DEG   = 42;          // fixed launch angle (tunable)
const LAUNCH_RAD         = (LAUNCH_ANGLE_DEG * Math.PI) / 180;

// ballGravity_base scaled by multiplier (we use 1.0 default)
const BALL_GRAVITY_BASE  = GRAVITY_WU;
const BALL_MASS_BASE     = 1.0;

// Floor zone multiplier thresholds (DynamicFloorMultiplierThresholds)
export const FLOOR_ZONES = [
  { minWx: 0,   label: '1×', mult: 1, color: '#1a3a1a' },
  { minWx: 50,  label: '2×', mult: 2, color: '#1a3a2a' },
  { minWx: 100, label: '3×', mult: 3, color: '#1a3a3a' },
  { minWx: 160, label: '4×', mult: 4, color: '#1a2a3a' },
  { minWx: 220, label: '5×', mult: 5, color: '#2a1a3a' },
];

// Chest definitions — 3 types, each has 3 rarity tiers
export const CHEST_TYPES = {
  power:   { emoji:'⚡', label:'Power',   color:'#ffd600', desc:'Boosts launch power', tiers:[1.5, 2.0, 3.0] },
  bomb:    { emoji:'💣', label:'Bombs',   color:'#ff6d00', desc:'More bombs on field', tiers:[2,   4,   6  ] },
  bouncer: { emoji:'🟡', label:'Bouncer', color:'#7c4dff', desc:'Add spring bouncers', tiers:[2,   4,   6  ] },
};

// Gift tiers — how much chargeBar fills (or in-flight boost)
export const GIFT_TIERS = {
  small:  { label:'Charge+',    color:'#00e5ff', chargeAdd:8,   force:3,  emoji:'💨', coins:[1,9]          },
  medium: { label:'Big Charge!',color:'#ffd600', chargeAdd:18,  force:8,  emoji:'⚡', coins:[10,99]         },
  large:  { label:'Super!',     color:'#ff6d00', chargeAdd:35,  force:16, emoji:'🔥', coins:[100,999]       },
  mega:   { label:'MEGA!',      color:'#ff1744', chargeAdd:65,  force:30, emoji:'💥', coins:[1000,9999]     },
  ultra:  { label:'ULTRA!',     color:'#ea80fc', chargeAdd:999, force:55, emoji:'🌟', coins:[10000,Infinity]},
};
export function getGiftTier(coins) {
  for (const [id, t] of Object.entries(GIFT_TIERS))
    if (coins >= t.coins[0] && coins <= t.coins[1]) return { id, ...t };
  return { id:'small', ...GIFT_TIERS.small };
}

// ── Obstacle builders ────────────────────────────────────────────────────
function buildObstacles(bombCount, bouncerCount) {
  const obs = [];
  let id = 0;
  // Bombs — spread across platform, weighted toward middle-far
  const bombPositions = [55, 80, 105, 130, 155, 180, 205, 235, 265, 295];
  for (let i = 0; i < Math.min(bombCount, bombPositions.length); i++) {
    obs.push({ id: id++, type: 'bomb',    wx: bombPositions[i], wy: 0, r: 1.8, active: true, color:'#ff6d00' });
  }
  // Bouncers
  const bouncePositions = [65, 95, 125, 170, 200, 250];
  for (let i = 0; i < Math.min(bouncerCount, bouncePositions.length); i++) {
    obs.push({ id: id++, type: 'bouncer', wx: bouncePositions[i], wy: 0, r: 1.6, active: true, color:'#7c4dff' });
  }
  // Power pickups (fixed positions, always present)
  [90, 145, 195].forEach(wx => {
    obs.push({ id: id++, type: 'power', wx, wy: 1.5, r: 1.2, active: true, color:'#00e5ff' });
  });
  return obs;
}

function getFloorZone(wx) {
  let zone = FLOOR_ZONES[0];
  for (const z of FLOOR_ZONES) { if (wx >= z.minWx) zone = z; else break; }
  return zone;
}

// ── Main hook ─────────────────────────────────────────────────────────────
export function useCannonEngine() {

  // React state → drives SVG render each tick
  const [phase,         setPhase]        = useState('idle');
  // idle | chest_pick | charging | in_flight | rolling | landed
  const [chestsPicked,  setChestsPicked] = useState([]); // up to 3
  const [multipliers,   setMultipliers]  = useState({ power:1, bomb:0, bouncer:0 });
  const [chargeLevel,   setChargeLevel]  = useState(0);  // 0–100
  const [fuelsLeft,     setFuelsLeft]    = useState(1);  // launcherFuels
  const [ballWx,        setBallWx]       = useState(0);
  const [ballWy,        setBallWy]       = useState(0);
  const [ballRot,       setBallRot]      = useState(0);
  const [camWx,         setCamWx]        = useState(0);
  const [currentDist,   setCurrentDist]  = useState(0);
  const [finalScore,    setFinalScore]   = useState(0);
  const [bestScore,     setBestScore]    = useState(0);
  const [obstacles,     setObstacles]    = useState([]);
  const [explosions,    setExplosions]   = useState([]);
  const [activeBoost,   setActiveBoost]  = useState(null);
  const [boostQueue,    setBoostQueue]   = useState([]);
  const [leaderboard,   setLeaderboard]  = useState([]);
  const [roundCount,    setRoundCount]   = useState(0);
  const [trajectory,    setTrajectory]   = useState([]); // arc preview points
  const [floorZone,     setFloorZone]    = useState(FLOOR_ZONES[0]);
  const [hitEffects,    setHitEffects]   = useState([]);

  // Refs — physics values safe inside setInterval
  const phaseRef    = useRef('idle');
  const posRef      = useRef({ wx:0, wy:0 });
  const velRef      = useRef({ wx:0, wy:0 });
  const camRef      = useRef(0);
  const rotRef      = useRef(0);
  const chargeRef   = useRef(0);
  const holdingRef  = useRef(false);    // is fire button held?
  const fuelsRef    = useRef(1);
  const multRef     = useRef({ power:1, bomb:0, bouncer:0 });
  const obsRef      = useRef([]);
  const timerRef    = useRef(null);
  const shooterRef  = useRef('host');
  const bestRef     = useRef(0);
  const boostRef    = useRef([]);
  const hefRef      = useRef(0);        // hit effect id counter

  const stopAll = useCallback(() => {
    clearInterval(timerRef.current); timerRef.current = null;
  }, []);

  // ── Computed trajectory arc preview ───────────────────────────────────
  const computeTrajectory = useCallback((chargeAmt, multPower) => {
    const pct     = chargeAmt / CHARGE_MAX;
    const speed   = LAUNCH_POWER_BASE * multPower * pct;
    const vx0     = speed * Math.cos(LAUNCH_RAD);
    const vy0     = speed * Math.sin(LAUNCH_RAD);
    const pts     = [];
    const dt      = 0.06;
    let wx = 0, wy = 0, vx = vx0, vy = vy0;
    for (let t = 0; t < 3.5 && wy >= 0; t += dt) {
      pts.push({ wx: Math.round(wx * 10) / 10, wy: Math.round(wy * 10) / 10 });
      vy -= GRAVITY_WU * dt;
      wx += vx * dt;
      wy += vy * dt;
      if (wy < 0) { pts.push({ wx, wy: 0 }); break; }
    }
    setTrajectory(pts);
  }, []);

  // ── Chest pick logic ─────────────────────────────────────────────────
  const pickChest = useCallback((chestType) => {
    if (phaseRef.current !== 'chest_pick') return;
    setChestsPicked(prev => {
      if (prev.length >= 3) return prev;
      const next = [...prev, chestType];
      // When 3 picked, compute multipliers and move to charging
      if (next.length === 3) {
        const m = { power: 1, bomb: 2, bouncer: 2 }; // defaults
        next.forEach(t => {
          const tier = Math.floor(Math.random() * 3); // random rarity tier
          if (t === 'power')   m.power = CHEST_TYPES.power.tiers[tier];
          if (t === 'bomb')    m.bomb  += CHEST_TYPES.bomb.tiers[tier];
          if (t === 'bouncer') m.bouncer += CHEST_TYPES.bouncer.tiers[tier];
        });
        multRef.current = m;
        setMultipliers(m);
        const obs = buildObstacles(m.bomb, m.bouncer);
        obsRef.current = obs;
        setObstacles(obs);
        setTimeout(() => {
          setPhase('charging'); phaseRef.current = 'charging';
          computeTrajectory(0, m.power);
        }, 600);
      }
      return next;
    });
  }, [computeTrajectory]);

  // ── Charge bar hold start / end ───────────────────────────────────────
  const startHold = useCallback(() => {
    if (phaseRef.current !== 'charging') return;
    holdingRef.current = true;
  }, []);

  const endHold = useCallback(() => {
    holdingRef.current = false;
    if (phaseRef.current === 'charging' && chargeRef.current >= CHARGE_THRESHOLD) {
      fireBall();
    }
  }, []); // fireBall defined below via ref

  // ── Fire ball ─────────────────────────────────────────────────────────
  const fireBallRef = useRef(null);
  const fireBall = useCallback(() => {
    if (phaseRef.current !== 'charging') return;
    if (chargeRef.current < CHARGE_THRESHOLD) return;
    const pct   = chargeRef.current / CHARGE_MAX;
    const speed = LAUNCH_POWER_BASE * multRef.current.power * pct;
    velRef.current = {
      wx: speed * Math.cos(LAUNCH_RAD),
      wy: speed * Math.sin(LAUNCH_RAD),
    };
    posRef.current  = { wx: 0, wy: 0 };
    rotRef.current  = 0;
    camRef.current  = 0;
    setPhase('in_flight'); phaseRef.current = 'in_flight';
    setRoundCount(n => n + 1);
    setTrajectory([]);
    setExplosions([]); setHitEffects([]);
    timerRef.current = updateTick(shooterRef.current);
  }, []);
  useEffect(() => { fireBallRef.current = fireBall; }, [fireBall]);
  // Patch endHold reference
  const endHoldFinal = useCallback(() => {
    holdingRef.current = false;
    if (phaseRef.current === 'charging' && chargeRef.current >= CHARGE_THRESHOLD)
      fireBallRef.current?.();
  }, []);

  // ── Main physics tick ─────────────────────────────────────────────────
  const updateTick = useCallback((shooter) => {
    const dt = TICK_MS / 1000;
    return setInterval(() => {
      const p = phaseRef.current;

      // ── Charging phase: update chargeBar ──────────────────────────────
      if (p === 'charging') {
        let c = chargeRef.current;
        if (holdingRef.current) c = Math.min(CHARGE_MAX, c + CHARGE_HOLD_RATE * dt);
        else                    c = Math.max(0, c - CHARGE_DECAY_RATE * dt);
        chargeRef.current = c;
        setChargeLevel(c);
        computeTrajectory(c, multRef.current.power);
        // Auto-fire at 100%
        if (c >= CHARGE_MAX) fireBallRef.current?.();
        return;
      }

      if (p !== 'in_flight' && p !== 'rolling') return;

      let { wx, wy }     = posRef.current;
      let { wx:vx, wy:vy } = velRef.current;

      if (p === 'in_flight') {
        // ── Gravity arc (LaunchTrajectoryUI physics) ───────────────────
        vy -= BALL_GRAVITY_BASE * dt;
        wx += vx * dt;
        wy += vy * dt;

        // Ball rotation proportional to speed
        rotRef.current = (rotRef.current + vx * 8 * dt) % 360;

        if (wy <= 0) {
          // Landed on platform
          wy  = 0;
          vy  = -Math.abs(vy) * BOUNCE_REST; // small bounce
          if (Math.abs(vy) < 0.5) vy = 0;
          setPhase('rolling'); phaseRef.current = 'rolling';
        }
      } else if (p === 'rolling') {
        // ── Ground rolling physics ─────────────────────────────────────
        if (wy > 0) {
          vy -= BALL_GRAVITY_BASE * dt;       // still airborne from bounce
          wy  = Math.max(0, wy + vy * dt);
          if (wy <= 0) { wy = 0; vy = Math.abs(vy) < 0.5 ? 0 : -Math.abs(vy)*BOUNCE_REST; }
        } else {
          vy = 0;
        }
        vx *= FRICTION_GND;                   // rolling resistance
        wx += vx * dt;
        rotRef.current = (rotRef.current + vx * 10 * dt) % 360;

        // Ball stopped
        if (vx < 0.08 && wy <= 0) {
          stopAll();
          const zone  = getFloorZone(wx);
          const score = Math.round(wx * zone.mult * 10);
          setFinalScore(score);
          bestRef.current = Math.max(bestRef.current, score);
          setBestScore(bestRef.current);
          setLeaderboard(prev => {
            const next = [...prev, { user: shooter, score, dist: Math.round(wx), ts: Date.now() }]
              .sort((a,b) => b.score - a.score);
            const seen = new Set();
            return next.filter(e => { if (seen.has(e.user)) return false; seen.add(e.user); return true; }).slice(0,10);
          });
          setPhase('landed'); phaseRef.current = 'landed';
          const f = fuelsRef.current - 1;
          fuelsRef.current = f;
          setFuelsLeft(f);
          return;
        }

        // ── Obstacle collision check ──────────────────────────────────
        let newObs = obsRef.current.map(ob => {
          if (!ob.active) return ob;
          const dx = wx - ob.wx, dy = wy - ob.wy;
          if (Math.sqrt(dx*dx + dy*dy) < ob.r + 0.9) {
            const eid = hefRef.current++;
            if (ob.type === 'bomb') {
              vx += 12 + Math.random() * 6;      // bombPower forward blast
              vy  = 6 + Math.random() * 4;        // upward kick
              setExplosions(prev => [...prev, { id:eid, wx:ob.wx, wy:ob.wy, r:4, color:ob.color }]);
              setTimeout(()=>setExplosions(prev=>prev.filter(e=>e.id!==eid)),700);
            } else if (ob.type === 'bouncer') {
              vy  = 10 + Math.abs(vx) * 0.4;     // bounceIntensity upward
              vx *= 0.8;
              setHitEffects(prev=>[...prev,{id:eid,wx:ob.wx,wy:ob.wy,label:'BOING!',color:ob.color}]);
              setTimeout(()=>setHitEffects(prev=>prev.filter(e=>e.id!==eid)),600);
            } else if (ob.type === 'power') {
              vx += 8;                             // speed pickup
              setHitEffects(prev=>[...prev,{id:eid,wx:ob.wx,wy:ob.wy,label:'+SPEED',color:ob.color}]);
              setTimeout(()=>setHitEffects(prev=>prev.filter(e=>e.id!==eid)),600);
            }
            return { ...ob, active: false };
          }
          return ob;
        });
        obsRef.current = newObs;
        setObstacles([...newObs]);
        setFloorZone(getFloorZone(wx));
      }

      wx = Math.max(0, wx);
      posRef.current = { wx, wy };
      velRef.current = { wx:vx, wy:vy };

      // Camera lerp
      const targetCam = Math.max(0, wx - CAM_LEAD_WU);
      camRef.current += (targetCam - camRef.current) * CAM_LERP;

      setBallWx(wx); setBallWy(wy);
      setBallRot(Math.round(rotRef.current));
      setCamWx(camRef.current);
      setCurrentDist(Math.round(wx));
    }, TICK_MS);
  }, [stopAll, computeTrajectory]);

  // ── processGift — TikTok gift handler ────────────────────────────────
  const processGift = useCallback((user, coins) => {
    const tier  = getGiftTier(coins);
    const boost = { ...tier, user, coins };
    const p     = phaseRef.current;

    if (p === 'charging') {
      // Fill chargeBar — this IS the mechanic (gifts = charge)
      chargeRef.current = Math.min(CHARGE_MAX, chargeRef.current + tier.chargeAdd);
      setChargeLevel(chargeRef.current);
      computeTrajectory(chargeRef.current, multRef.current.power);
      setActiveBoost(boost);
      setTimeout(()=>setActiveBoost(null), 1200);
      if (chargeRef.current >= CHARGE_MAX) fireBallRef.current?.();

    } else if (p === 'in_flight' || p === 'rolling') {
      // Mid-air / rolling boost
      velRef.current.wx += tier.force;
      setActiveBoost(boost);
      setTimeout(()=>setActiveBoost(null), 1200);

    } else if (p === 'idle' || p === 'landed') {
      // Queue boost for next launch, auto-start
      boostRef.current = [...boostRef.current, boost];
      setBoostQueue([...boostRef.current]);
      if (p === 'idle') setTimeout(()=>startRound(user), 300);
      else if (fuelsRef.current > 0) setTimeout(()=>refire(user), 300);

    } else if (p === 'chest_pick') {
      boostRef.current = [...boostRef.current, boost];
      setBoostQueue([...boostRef.current]);
    }
  }, [computeTrajectory]);

  // ── Refire (launcherFuels remaining) ─────────────────────────────────
  const refire = useCallback((shooter = 'host') => {
    if (phaseRef.current !== 'landed') return;
    if (fuelsRef.current <= 0) return;
    shooterRef.current = shooter;
    chargeRef.current  = 0;
    setChargeLevel(0);
    posRef.current     = { wx:0, wy:0 };
    velRef.current     = { wx:0, wy:0 };
    rotRef.current     = 0;
    camRef.current     = 0;
    setFinalScore(0); setCurrentDist(0);
    setBallWx(0); setBallWy(0); setBallRot(0); setCamWx(0);
    setExplosions([]); setHitEffects([]);
    // Rebuild obstacles for fresh shot
    const m = multRef.current;
    const obs = buildObstacles(m.bomb, m.bouncer);
    obsRef.current = obs; setObstacles(obs);
    setFloorZone(FLOOR_ZONES[0]);
    // Apply queued boosts to charge
    const queue = boostRef.current;
    if (queue.length) {
      const fill = Math.min(CHARGE_MAX, queue.reduce((s,b)=>s+b.chargeAdd,0));
      chargeRef.current = fill; setChargeLevel(fill);
      boostRef.current = []; setBoostQueue([]);
    }
    computeTrajectory(chargeRef.current, m.power);
    setPhase('charging'); phaseRef.current = 'charging';
    timerRef.current = updateTick(shooter);
  }, [computeTrajectory, updateTick]);

  // ── Start a fresh round (chest_pick) ──────────────────────────────────
  const startRound = useCallback((shooter = 'host') => {
    const p = phaseRef.current;
    if (p === 'charging' || p === 'in_flight' || p === 'rolling' || p === 'chest_pick') return;
    stopAll();
    shooterRef.current = shooter;
    chargeRef.current  = 0;
    holdingRef.current = false;
    posRef.current     = { wx:0, wy:0 };
    velRef.current     = { wx:0, wy:0 };
    rotRef.current     = 0;
    camRef.current     = 0;
    fuelsRef.current   = 1;
    multRef.current    = { power:1, bomb:2, bouncer:2 };
    obsRef.current     = [];
    setChestsPicked([]); setMultipliers({ power:1, bomb:2, bouncer:2 });
    setChargeLevel(0); setFuelsLeft(1);
    setBallWx(0); setBallWy(0); setBallRot(0); setCamWx(0);
    setCurrentDist(0); setFinalScore(0);
    setObstacles([]); setExplosions([]); setHitEffects([]);
    setTrajectory([]); setFloorZone(FLOOR_ZONES[0]);
    setPhase('chest_pick'); phaseRef.current = 'chest_pick';
  }, [stopAll]);

  const manualFire = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'idle' || p === 'landed') startRound('host');
    else if (p === 'charging') fireBallRef.current?.();
  }, [startRound]);

  const reset = useCallback(() => {
    stopAll();
    chargeRef.current=0; holdingRef.current=false;
    posRef.current={wx:0,wy:0}; velRef.current={wx:0,wy:0};
    rotRef.current=0; camRef.current=0; fuelsRef.current=1;
    multRef.current={power:1,bomb:2,bouncer:2};
    boostRef.current=[];
    setPhase('idle'); phaseRef.current='idle';
    setChestsPicked([]); setMultipliers({power:1,bomb:2,bouncer:2});
    setChargeLevel(0); setFuelsLeft(1);
    setBallWx(0); setBallWy(0); setBallRot(0); setCamWx(0);
    setCurrentDist(0); setFinalScore(0);
    setObstacles([]); setExplosions([]); setHitEffects([]);
    setTrajectory([]); setFloorZone(FLOOR_ZONES[0]);
    setBoostQueue([]); setActiveBoost(null);
  }, [stopAll]);

  useEffect(()=>()=>stopAll(),[stopAll]);

  return {
    // State
    phase, chestsPicked, multipliers, chargeLevel, fuelsLeft,
    ballWx, ballWy, ballRot, camWx, currentDist, finalScore, bestScore,
    obstacles, explosions, hitEffects, activeBoost, boostQueue,
    leaderboard, roundCount, trajectory, floorZone,
    // Actions
    startRound, pickChest, startHold, endHold: endHoldFinal,
    manualFire, reset, processGift, refire,
  };
}
