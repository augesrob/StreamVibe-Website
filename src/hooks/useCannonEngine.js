/**
 * useCannonEngine v8 — Ball Guys accurate physics
 * Sky-based game: ball fires into sky, lands on platform, hits obstacles
 * that launch it back up. Distance = how far along platform ball travels.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export const PX_PER_WU    = 9;    // pixels per world unit
export const GRAVITY_WU   = 11;   // wu/s² — tuned so ball arcs nicely through sky
export const FRICTION_GND = 0.985;
export const BOUNCE_REST  = 0.25;
export const TICK_MS      = 16;
const CAM_LERP_X          = 0.08;
const CAM_LEAD_WU         = 12;

export const CHARGE_MAX       = 100;
export const CHARGE_THRESHOLD = 30;
const CHARGE_HOLD_RATE        = 22;
const CHARGE_DECAY_RATE       = 6;

const LAUNCH_POWER_BASE = 48;   // wu/s at 100% charge
const LAUNCH_ANGLE_DEG  = 38;
const LAUNCH_RAD        = (LAUNCH_ANGLE_DEG * Math.PI) / 180;

export const FLOOR_ZONES = [
  { minWx:0,   label:'1×', mult:1, color:'#22cc44' },
  { minWx:40,  label:'2×', mult:2, color:'#44ccaa' },
  { minWx:80,  label:'3×', mult:3, color:'#44aacc' },
  { minWx:130, label:'4×', mult:4, color:'#6644cc' },
  { minWx:180, label:'5×', mult:5, color:'#cc44aa' },
];

export const CHEST_TYPES = {
  power:   { emoji:'⚡', label:'Power',   color:'#ffd600', desc:'Boosts launch power', tiers:[1.5,2.0,3.0] },
  bomb:    { emoji:'💣', label:'Bombs',   color:'#ff4444', desc:'More bombs on field', tiers:[2,4,6]       },
  bouncer: { emoji:'🟡', label:'Springs', color:'#ffaa00', desc:'Add spring bouncers', tiers:[2,4,6]       },
};

export const GIFT_TIERS = {
  small:  { label:'Charge+',    color:'#00e5ff', chargeAdd:10,  force:4,  emoji:'💨', coins:[1,9]          },
  medium: { label:'Big Charge!',color:'#ffd600', chargeAdd:22,  force:10, emoji:'⚡', coins:[10,99]         },
  large:  { label:'Super!',     color:'#ff6d00', chargeAdd:38,  force:18, emoji:'🔥', coins:[100,999]       },
  mega:   { label:'MEGA!',      color:'#ff1744', chargeAdd:70,  force:32, emoji:'💥', coins:[1000,9999]     },
  ultra:  { label:'ULTRA!',     color:'#ea80fc', chargeAdd:999, force:55, emoji:'🌟', coins:[10000,Infinity]},
};
export function getGiftTier(coins) {
  for (const [id,t] of Object.entries(GIFT_TIERS))
    if (coins >= t.coins[0] && coins <= t.coins[1]) return { id, ...t };
  return { id:'small', ...GIFT_TIERS.small };
}

function buildObstacles(bombCount, bouncerCount) {
  const obs = []; let id = 0;
  // Bombs sit ON the platform (wy = 0)
  const bombPos    = [22,38,55,72,90,108,126,148,170,195];
  const bouncePos  = [30,50,68,88,110,135,160,185];
  for (let i=0; i<Math.min(bombCount, bombPos.length); i++)
    obs.push({ id:id++, type:'bomb',    wx:bombPos[i],   wy:0, r:2.0, active:true });
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
  const [phase,        setPhase]       = useState('idle');
  const [chestsPicked, setChestsPicked]= useState([]);
  const [multipliers,  setMultipliers] = useState({ power:1, bomb:0, bouncer:0 });
  const [chargeLevel,  setChargeLevel] = useState(0);
  const [fuelsLeft,    setFuelsLeft]   = useState(1);
  const [ballWx,       setBallWx]      = useState(0);
  const [ballWy,       setBallWy]      = useState(0);
  const [ballRot,      setBallRot]     = useState(0);
  const [camWx,        setCamWx]       = useState(0);
  const [currentDist,  setCurrentDist] = useState(0);
  const [finalScore,   setFinalScore]  = useState(0);
  const [bestScore,    setBestScore]   = useState(0);
  const [obstacles,    setObstacles]   = useState([]);
  const [explosions,   setExplosions]  = useState([]);
  const [activeBoost,  setActiveBoost] = useState(null);
  const [boostQueue,   setBoostQueue]  = useState([]);
  const [leaderboard,  setLeaderboard] = useState([]);
  const [roundCount,   setRoundCount]  = useState(0);
  const [trajectory,   setTrajectory]  = useState([]);
  const [floorZone,    setFloorZone]   = useState(FLOOR_ZONES[0]);
  const [hitEffects,   setHitEffects]  = useState([]);
  const [shooter,      setShooter]     = useState('');

  const phaseRef   = useRef('idle');
  const posRef     = useRef({ wx:0, wy:0 });
  const velRef     = useRef({ wx:0, wy:0 });
  const camRef     = useRef(0);
  const rotRef     = useRef(0);
  const chargeRef  = useRef(0);
  const holdingRef = useRef(false);
  const fuelsRef   = useRef(1);
  const multRef    = useRef({ power:1, bomb:0, bouncer:0 });
  const obsRef     = useRef([]);
  const timerRef   = useRef(null);
  const shooterRef = useRef('host');
  const bestRef    = useRef(0);
  const boostRef   = useRef([]);
  const hefRef     = useRef(0);
  const fireBallRef   = useRef(null);
  const updateTickRef = useRef(null);

  const stopAll = useCallback(() => {
    clearInterval(timerRef.current); timerRef.current = null;
  }, []);

  const computeTrajectory = useCallback((chargeAmt, multPower) => {
    const pct = chargeAmt / CHARGE_MAX;
    const speed = LAUNCH_POWER_BASE * multPower * pct;
    const vx0 = speed * Math.cos(LAUNCH_RAD);
    const vy0 = speed * Math.sin(LAUNCH_RAD);
    const pts = []; const dt = 0.05;
    let wx=0, wy=0, vx=vx0, vy=vy0;
    for (let t=0; t<6.0; t+=dt) {
      pts.push({ wx, wy });
      vy -= GRAVITY_WU * dt; wx += vx * dt; wy += vy * dt;
      if (wy < 0 && t > 0.1) { pts.push({ wx, wy:0 }); break; }
    }
    setTrajectory(pts);
  }, []);

  const pickChest = useCallback((chestType) => {
    if (phaseRef.current !== 'chest_pick') return;
    setChestsPicked(prev => {
      if (prev.length >= 3) return prev;
      const next = [...prev, chestType];
      if (next.length === 3) {
        const m = { power:1, bomb:2, bouncer:2 };
        next.forEach(t => {
          const tier = Math.floor(Math.random() * 3);
          if (t === 'power')   m.power    = CHEST_TYPES.power.tiers[tier];
          if (t === 'bomb')    m.bomb    += CHEST_TYPES.bomb.tiers[tier];
          if (t === 'bouncer') m.bouncer += CHEST_TYPES.bouncer.tiers[tier];
        });
        multRef.current = m;
        setMultipliers(m);
        const obs = buildObstacles(m.bomb, m.bouncer);
        obsRef.current = obs; setObstacles(obs);
        setTimeout(() => {
          setPhase('charging'); phaseRef.current = 'charging';
          computeTrajectory(0, m.power);
          stopAll();
          timerRef.current = updateTickRef.current?.(shooterRef.current);
        }, 600);
      }
      return next;
    });
  }, [computeTrajectory, stopAll]);

  const startHold = useCallback(() => {
    if (phaseRef.current !== 'charging') return;
    holdingRef.current = true;
  }, []);

  const endHold = useCallback(() => {
    holdingRef.current = false;
    if (phaseRef.current === 'charging' && chargeRef.current >= CHARGE_THRESHOLD)
      fireBallRef.current?.();
  }, []);

  const fireBall = useCallback(() => {
    if (phaseRef.current !== 'charging') return;
    if (chargeRef.current < CHARGE_THRESHOLD) return;
    stopAll();
    const pct = chargeRef.current / CHARGE_MAX;
    const speed = LAUNCH_POWER_BASE * multRef.current.power * pct;
    velRef.current = { wx: speed * Math.cos(LAUNCH_RAD), wy: speed * Math.sin(LAUNCH_RAD) };
    posRef.current = { wx:0, wy:0 };
    rotRef.current = 0; camRef.current = 0;
    setPhase('in_flight'); phaseRef.current = 'in_flight';
    setRoundCount(n => n+1);
    setTrajectory([]); setExplosions([]); setHitEffects([]);
    timerRef.current = updateTickRef.current?.(shooterRef.current);
  }, [stopAll]);

  useEffect(() => { fireBallRef.current = fireBall; }, [fireBall]);

  const updateTick = useCallback((currentShooter) => {
    const dt = TICK_MS / 1000;
    return setInterval(() => {
      const p = phaseRef.current;

      if (p === 'charging') {
        let c = chargeRef.current;
        if (holdingRef.current) c = Math.min(CHARGE_MAX, c + CHARGE_HOLD_RATE * dt);
        else                    c = Math.max(0, c - CHARGE_DECAY_RATE * dt);
        chargeRef.current = c;
        setChargeLevel(c);
        computeTrajectory(c, multRef.current.power);
        if (c >= CHARGE_MAX) fireBallRef.current?.();
        return;
      }

      if (p !== 'in_flight' && p !== 'rolling') return;

      let { wx, wy }       = posRef.current;
      let { wx:vx, wy:vy } = velRef.current;

      // Apply gravity always
      vy -= GRAVITY_WU * dt;
      wx += vx * dt;
      wy += vy * dt;
      rotRef.current = (rotRef.current + vx * 6 * dt) % 360;

      // Hit the platform (wy <= 0)
      if (wy <= 0) {
        wy = 0;
        // Bounce with restitution — if tiny vertical speed, stop bouncing
        if (Math.abs(vy) < 1.5) {
          vy = 0;
          if (p === 'in_flight') { setPhase('rolling'); phaseRef.current = 'rolling'; }
        } else {
          vy = -Math.abs(vy) * BOUNCE_REST;
          if (p === 'in_flight') { setPhase('rolling'); phaseRef.current = 'rolling'; }
        }
      }

      // Friction when on ground
      if (wy <= 0) {
        vx *= FRICTION_GND;
      }

      // Ball stopped
      if (wy <= 0 && Math.abs(vx) < 0.1 && Math.abs(vy) < 0.5) {
        stopAll();
        const zone  = getFloorZone(wx);
        const score = Math.round(wx * zone.mult * 10);
        setFinalScore(score);
        bestRef.current = Math.max(bestRef.current, score);
        setBestScore(bestRef.current);
        setLeaderboard(prev => {
          const next = [...prev, { user:currentShooter, score, dist:Math.round(wx), ts:Date.now() }]
            .sort((a,b) => b.score - a.score);
          const seen = new Set();
          return next.filter(e => { if (seen.has(e.user)) return false; seen.add(e.user); return true; }).slice(0,10);
        });
        setPhase('landed'); phaseRef.current = 'landed';
        fuelsRef.current -= 1; setFuelsLeft(fuelsRef.current);
        return;
      }

      // Obstacle collisions (only when ball is near platform)
      if (wy <= 3.5) {
        const newObs = obsRef.current.map(ob => {
          if (!ob.active) return ob;
          const dx = wx - ob.wx;
          const dy = wy - ob.wy;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < ob.r + 1.2) {
            const eid = hefRef.current++;
            if (ob.type === 'bomb') {
              // Big forward blast + launch up into sky
              vx += 18 + Math.random() * 8;
              vy  = 22 + Math.random() * 8;
              wy  = 0.5; // lift off ground slightly
              setExplosions(prev => [...prev, { id:eid, wx:ob.wx, wy:ob.wy, r:5, ts:Date.now() }]);
              setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== eid)), 800);
              setHitEffects(prev => [...prev, { id:eid+'b', wx:ob.wx, wy:ob.wy+2, label:'BOOM!', color:'#ff4444' }]);
              setTimeout(() => setHitEffects(prev => prev.filter(e => e.id !== eid+'b')), 700);
            } else if (ob.type === 'bouncer') {
              // Spring launch — high up, keep forward speed
              vy  = 24 + Math.abs(vx) * 0.5;
              vx *= 1.1; // slight speed boost forward
              wy  = 0.5;
              setHitEffects(prev => [...prev, { id:eid, wx:ob.wx, wy:ob.wy+2, label:'BOING!', color:'#ffaa00' }]);
              setTimeout(() => setHitEffects(prev => prev.filter(e => e.id !== eid)), 700);
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
      posRef.current = { wx, wy }; velRef.current = { wx:vx, wy:vy };
      const targetCam = Math.max(0, wx - CAM_LEAD_WU);
      camRef.current += (targetCam - camRef.current) * CAM_LERP_X;
      setBallWx(wx); setBallWy(wy);
      setBallRot(Math.round(rotRef.current));
      setCamWx(camRef.current);
      setCurrentDist(Math.round(wx));
    }, TICK_MS);
  }, [stopAll, computeTrajectory]);

  useEffect(() => { updateTickRef.current = updateTick; }, [updateTick]);

  const processGift = useCallback((user, coins) => {
    const tier  = getGiftTier(coins);
    const boost = { ...tier, user, coins };
    const p     = phaseRef.current;
    if (p === 'charging') {
      chargeRef.current = Math.min(CHARGE_MAX, chargeRef.current + tier.chargeAdd);
      setChargeLevel(chargeRef.current);
      computeTrajectory(chargeRef.current, multRef.current.power);
      setActiveBoost(boost); setTimeout(()=>setActiveBoost(null),1400);
      if (chargeRef.current >= CHARGE_MAX) fireBallRef.current?.();
    } else if (p === 'in_flight' || p === 'rolling') {
      velRef.current.wx += tier.force;
      setActiveBoost(boost); setTimeout(()=>setActiveBoost(null),1400);
    } else if (p === 'idle' || p === 'landed') {
      boostRef.current = [...boostRef.current, boost];
      setBoostQueue([...boostRef.current]);
      if (p === 'idle') setTimeout(()=>startRound(user), 300);
      else if (fuelsRef.current > 0) setTimeout(()=>refire(user), 300);
    } else if (p === 'chest_pick') {
      boostRef.current = [...boostRef.current, boost];
      setBoostQueue([...boostRef.current]);
    }
  }, [computeTrajectory]);

  const refire = useCallback((sh = 'host') => {
    if (phaseRef.current !== 'landed') return;
    if (fuelsRef.current <= 0) return;
    stopAll();
    shooterRef.current = sh; setShooter(sh);
    chargeRef.current = 0; setChargeLevel(0);
    posRef.current = {wx:0,wy:0}; velRef.current = {wx:0,wy:0};
    rotRef.current = 0; camRef.current = 0;
    setFinalScore(0); setCurrentDist(0);
    setBallWx(0); setBallWy(0); setBallRot(0); setCamWx(0);
    setExplosions([]); setHitEffects([]);
    const m = multRef.current;
    const obs = buildObstacles(m.bomb, m.bouncer);
    obsRef.current = obs; setObstacles(obs);
    setFloorZone(FLOOR_ZONES[0]);
    const queue = boostRef.current;
    if (queue.length) {
      chargeRef.current = Math.min(CHARGE_MAX, queue.reduce((s,b)=>s+b.chargeAdd,0));
      setChargeLevel(chargeRef.current);
      boostRef.current = []; setBoostQueue([]);
    }
    computeTrajectory(chargeRef.current, m.power);
    setPhase('charging'); phaseRef.current = 'charging';
    timerRef.current = updateTickRef.current?.(sh);
  }, [stopAll, computeTrajectory]);

  const startRound = useCallback((sh = 'host') => {
    const p = phaseRef.current;
    if (p==='charging'||p==='in_flight'||p==='rolling'||p==='chest_pick') return;
    stopAll();
    shooterRef.current = sh; setShooter(sh);
    chargeRef.current=0; holdingRef.current=false;
    posRef.current={wx:0,wy:0}; velRef.current={wx:0,wy:0};
    rotRef.current=0; camRef.current=0; fuelsRef.current=1;
    multRef.current={power:1,bomb:2,bouncer:2};
    obsRef.current=[];
    setChestsPicked([]); setMultipliers({power:1,bomb:2,bouncer:2});
    setChargeLevel(0); setFuelsLeft(1);
    setBallWx(0); setBallWy(0); setBallRot(0); setCamWx(0);
    setCurrentDist(0); setFinalScore(0);
    setObstacles([]); setExplosions([]); setHitEffects([]);
    setTrajectory([]); setFloorZone(FLOOR_ZONES[0]);
    setPhase('chest_pick'); phaseRef.current = 'chest_pick';
  }, [stopAll]);

  const manualFire = useCallback(() => {
    const p = phaseRef.current;
    if (p==='idle'||p==='landed') startRound('host');
    else if (p==='charging') fireBallRef.current?.();
  }, [startRound]);

  const reset = useCallback(() => {
    stopAll();
    chargeRef.current=0; holdingRef.current=false;
    posRef.current={wx:0,wy:0}; velRef.current={wx:0,wy:0};
    rotRef.current=0; camRef.current=0; fuelsRef.current=1;
    multRef.current={power:1,bomb:2,bouncer:2}; boostRef.current=[];
    setPhase('idle'); phaseRef.current='idle';
    setChestsPicked([]); setMultipliers({power:1,bomb:2,bouncer:2});
    setChargeLevel(0); setFuelsLeft(1);
    setBallWx(0); setBallWy(0); setBallRot(0); setCamWx(0);
    setCurrentDist(0); setFinalScore(0);
    setObstacles([]); setExplosions([]); setHitEffects([]);
    setTrajectory([]); setFloorZone(FLOOR_ZONES[0]);
    setBoostQueue([]); setActiveBoost(null);
  }, [stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  return {
    phase, chestsPicked, multipliers, chargeLevel, fuelsLeft,
    ballWx, ballWy, ballRot, camWx, currentDist, finalScore, bestScore,
    obstacles, explosions, hitEffects, activeBoost, boostQueue,
    leaderboard, roundCount, trajectory, floorZone, shooter,
    startRound, pickChest, startHold, endHold,
    manualFire, reset, processGift, refire,
  };
}
