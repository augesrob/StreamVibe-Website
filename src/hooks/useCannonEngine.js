/**
 * useCannonEngine v2 — Full physics with bouncing, bombs, power pickups, camera
 *
 * Phases: idle → aiming (wobble) → flying → bouncing → rolling → landed
 * Gifts auto-trigger aiming sequence → random angle → fire
 * World objects generated dynamically as ball travels
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export const BOOST_TIERS = {
  small:  { label: 'Boost!',       color: '#00e5ff', power: 1.15, emoji: '💨', coins: [1,9]    },
  medium: { label: 'Power Boost!', color: '#ffd600', power: 1.40, emoji: '⚡', coins: [10,99]   },
  large:  { label: 'Super Boost!', color: '#ff6d00', power: 1.70, emoji: '🔥', coins: [100,999] },
  mega:   { label: 'MEGA BLAST!',  color: '#ff1744', power: 2.20, emoji: '💥', coins: [1000,9999]},
  ultra:  { label: 'ULTRA BLAST!', color: '#ea80fc', power: 5.00, emoji: '🌟', coins: [10000,Infinity]},
};

export function getBoostTier(coins) {
  for (const [id, tier] of Object.entries(BOOST_TIERS)) {
    if (coins >= tier.coins[0] && coins <= tier.coins[1]) return { id, ...tier };
  }
  return { id: 'small', ...BOOST_TIERS.small };
}

// Physics
const GRAVITY      = 320;   // px/s² (world units = pixels/scale)
const SCALE        = 5;     // pixels per metre
const BASE_VX      = 160;   // px/s base horizontal speed
const RESTITUTION  = 0.52;  // bounce energy retention
const ROLL_FRICTION= 0.983; // per-tick horizontal friction while rolling
const AIR_DRAG     = 0.9995;// per-tick horizontal air drag while flying
const STOP_VX      = 8;     // px/s - stop rolling below this
const STOP_VY      = 12;    // px/s - stop bouncing below this
const TICK_MS      = 16;

// World object hit radius (in pixels)
const BOMB_RADIUS  = 22;
const POWER_RADIUS = 20;

// Generate world objects for a chunk starting at worldX
function generateChunk(startX, endX) {
  const objects = [];
  let x = startX + 40 + Math.random() * 30;
  while (x < endX) {
    const type = Math.random() < 0.55 ? 'bomb' : 'power';
    objects.push({ id: `${type}_${Math.round(x)}`, type, x, active: true });
    x += 60 + Math.random() * 120;
  }
  return objects;
}

export function useCannonEngine() {
  // ── phase: idle | aiming | flying | bouncing | rolling | landed ──────────
  const [phase,        setPhase]       = useState('idle');
  const [angle,        setAngle]       = useState(45);       // display angle
  const [ballPos,      setBallPos]     = useState({ x: 0, y: 0 });
  const [cameraX,      setCameraX]     = useState(0);        // camera scroll px
  const [distance,     setDistance]    = useState(0);
  const [topDistance,  setTopDistance] = useState(0);
  const [activeBoost,  setActiveBoost] = useState(null);
  const [boostQueue,   setBoostQueue]  = useState([]);
  const [worldObjects, setWorldObjects]= useState([]);       // bombs + powers
  const [explosions,   setExplosions]  = useState([]);       // [{id,x,y,color}]
  const [leaderboard,  setLeaderboard] = useState([]);
  const [lastShooter,  setLastShooter] = useState(null);
  const [roundCount,   setRoundCount]  = useState(0);
  const [activePowerMultiplier, setActivePowerMultiplier] = useState(1);

  // Refs for use inside setInterval
  const phaseRef    = useRef('idle');
  const posRef      = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const boostRef    = useRef([]);
  const objRef      = useRef([]);         // world objects (mutable)
  const multRef     = useRef(1);
  const timerRef    = useRef(null);
  const wobbleRef   = useRef(null);
  const shooterRef  = useRef('host');

  const stopAll = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (wobbleRef.current) { clearInterval(wobbleRef.current); wobbleRef.current = null; }
  }, []);

  // ── World object generation ───────────────────────────────────────────────
  const genChunkRef = useRef(0); // furthest x chunk generated

  const ensureWorldGen = useCallback((ballX) => {
    const needed = ballX + 2000;
    if (needed > genChunkRef.current) {
      const newObjs = generateChunk(genChunkRef.current, needed);
      genChunkRef.current = needed;
      objRef.current = [...objRef.current, ...newObjs];
      setWorldObjects([...objRef.current]);
    }
  }, []);

  // ── Physics tick ──────────────────────────────────────────────────────────
  const runPhysics = useCallback((shooter) => {
    stopAll();
    const dt = TICK_MS / 1000;

    timerRef.current = setInterval(() => {
      const p = phaseRef.current;
      if (p === 'idle' || p === 'aiming' || p === 'landed') { stopAll(); return; }

      let { x, y, vx, vy } = posRef.current;

      // Gravity
      vy -= GRAVITY * dt;

      // Air drag (horizontal)
      if (p === 'flying') vx *= AIR_DRAG;

      // Move
      x += vx * dt;
      y += vy * dt;

      // Ground collision
      const groundY = 0;
      if (y <= groundY) {
        y = groundY;
        if (Math.abs(vy) < STOP_VY) {
          vy = 0;
          // Rolling
          vx *= ROLL_FRICTION;
          if (phaseRef.current !== 'rolling') {
            setPhase('rolling'); phaseRef.current = 'rolling';
          }
          if (Math.abs(vx) < STOP_VX) {
            // Landed
            stopAll();
            const dist = Math.round(x / SCALE);
            setPhase('landed'); phaseRef.current = 'landed';
            setDistance(dist);
            setTopDistance(prev => Math.max(prev, dist));
            setLeaderboard(prev =>
              [{ user: shooter, distance: dist, ts: Date.now() }, ...prev]
                .sort((a,b) => b.distance - a.distance).slice(0, 10)
            );
            posRef.current = { x, y: 0, vx: 0, vy: 0 };
            setBallPos({ x, y: 0 });
            return;
          }
        } else {
          vy = -vy * RESTITUTION;
          if (phaseRef.current !== 'bouncing') {
            setPhase('bouncing'); phaseRef.current = 'bouncing';
          }
        }
      }

      // Check world object collisions
      const hitRadius = 28; // pixels
      let hitObj = null;
      for (const obj of objRef.current) {
        if (!obj.active) continue;
        const dx = Math.abs(x - obj.x);
        const dy = Math.abs(y - 0); // objects sit on ground
        if (dx < hitRadius && dy < 40) {
          hitObj = obj;
          break;
        }
      }

      if (hitObj) {
        // Deactivate object
        objRef.current = objRef.current.map(o =>
          o.id === hitObj.id ? { ...o, active: false } : o
        );
        setWorldObjects([...objRef.current]);

        if (hitObj.type === 'bomb') {
          // Bomb: launch upward + forward
          vx += 80 + Math.random() * 60;
          vy  = 120 + Math.random() * 80;
          y   = 5;
          setPhase('flying'); phaseRef.current = 'flying';
          // Explosion
          const expColor = '#ff4400';
          const expId = Date.now();
          setExplosions(prev => [...prev, { id: expId, x, y: 0, color: expColor }]);
          setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== expId)), 800);
          setActiveBoost({ emoji: '💣', label: 'BOMB!', color: expColor, user: null });
          setTimeout(() => setActiveBoost(null), 1200);
        } else {
          // Power pickup: horizontal speed boost
          vx *= 1.5;
          vy  = Math.max(vy, 20);
          const expColor = '#ffd700';
          const expId = Date.now();
          setExplosions(prev => [...prev, { id: expId, x, y: 0, color: expColor }]);
          setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== expId)), 600);
          setActiveBoost({ emoji: '⚡', label: 'POWER!', color: expColor, user: null });
          setTimeout(() => setActiveBoost(null), 1000);
        }
      }

      // Ensure world is generated ahead
      ensureWorldGen(x);

      // Update camera (follow ball, cannon stays at left ~20% of screen)
      const CANVAS_W_PX = 860;
      const camTarget = Math.max(0, x - CANVAS_W_PX * 0.28);
      setCameraX(camTarget);

      posRef.current = { x, y, vx, vy };
      setBallPos({ x, y });
      setDistance(Math.round(Math.max(0, x / SCALE)));
    }, TICK_MS);
  }, [stopAll, ensureWorldGen]);

  // ── Wobble then fire ──────────────────────────────────────────────────────
  const fireWithWobble = useCallback((shooter = 'host') => {
    if (phaseRef.current === 'flying' || phaseRef.current === 'bouncing' || phaseRef.current === 'rolling' || phaseRef.current === 'aiming') return;

    setPhase('aiming'); phaseRef.current = 'aiming';
    shooterRef.current = shooter;

    // Drain boost queue
    const queue = boostRef.current;
    let totalMult = 1;
    let lastBoost = null;
    queue.forEach(b => { totalMult *= b.power; lastBoost = b; });
    boostRef.current = [];
    setBoostQueue([]);
    multRef.current = totalMult;
    setActivePowerMultiplier(totalMult);

    // Wobble animation — barrel sweeps up and down
    let wobbleT = 0;
    const WOBBLE_DURATION = 1400; // ms
    const wobbleStart = Date.now();

    wobbleRef.current = setInterval(() => {
      const elapsed = Date.now() - wobbleStart;
      if (elapsed >= WOBBLE_DURATION) {
        clearInterval(wobbleRef.current); wobbleRef.current = null;
        // Pick random angle 25-65°
        const finalAngle = 25 + Math.floor(Math.random() * 40);
        setAngle(finalAngle);

        // Reset world
        const newObjects = generateChunk(0, 2000);
        genChunkRef.current = 2000;
        objRef.current = newObjects;
        setWorldObjects(newObjects);

        // Init ball
        const rad = (finalAngle * Math.PI) / 180;
        const spd = BASE_VX * totalMult;
        posRef.current = { x: 0, y: 0, vx: spd * Math.cos(rad), vy: spd * Math.sin(rad) };

        setLastShooter(shooter);
        setRoundCount(n => n + 1);
        if (lastBoost) {
          setActiveBoost(lastBoost);
          setTimeout(() => setActiveBoost(null), 2000);
        }

        setPhase('flying'); phaseRef.current = 'flying';
        setBallPos({ x: 0, y: 0 });
        setDistance(0);
        setCameraX(0);
        runPhysics(shooter);
        return;
      }
      // Oscillate angle
      const progress = elapsed / WOBBLE_DURATION;
      const sweepAngle = 20 + Math.sin(progress * Math.PI * 5) * 25 + progress * 20;
      setAngle(Math.max(10, Math.min(75, Math.round(sweepAngle))));
    }, 30);
  }, [runPhysics]);

  const processGift = useCallback((user, coins) => {
    const tier = getBoostTier(coins);
    const boost = { ...tier, user, coins };
    boostRef.current = [...boostRef.current, boost];
    setBoostQueue([...boostRef.current]);
    const p = phaseRef.current;
    if (p === 'idle' || p === 'landed') {
      setTimeout(() => fireWithWobble(user), 200);
    }
  }, [fireWithWobble]);

  const manualFire = useCallback(() => {
    fireWithWobble('host');
  }, [fireWithWobble]);

  const reset = useCallback(() => {
    stopAll();
    setPhase('idle'); phaseRef.current = 'idle';
    setBallPos({ x: 0, y: 0 });
    setDistance(0);
    setCameraX(0);
    setAngle(45);
    boostRef.current = [];
    setBoostQueue([]);
    multRef.current = 1;
    setActivePowerMultiplier(1);
    setActiveBoost(null);
    setExplosions([]);
    setWorldObjects([]);
    objRef.current = [];
    genChunkRef.current = 0;
  }, [stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  return {
    phase, angle, ballPos, cameraX, distance, topDistance,
    activeBoost, boostQueue, worldObjects, explosions,
    leaderboard, lastShooter, roundCount, activePowerMultiplier,
    setAngle: useCallback(v => setAngle(Math.max(10, Math.min(75, v))), []),
    manualFire, reset, processGift,
  };
}
