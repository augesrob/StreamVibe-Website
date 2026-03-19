/**
 * useCannonEngine v4 — "Cannon Climb" / Ball Guys Cannon Mode
 *
 * The player IS the ball. Ball rolls UP a 20° incline.
 * Enemy cannons placed along the slope fire downward projectiles.
 * Getting hit triggers knockback (ragdoll state) — ball flies back down slope.
 * Score = furthest point reached on the slope.
 *
 * TikTok gifts = speed boosts to help the ball climb faster.
 * Phases: idle → aiming (wobble) → climbing → ragdoll → landed
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export const BOOST_TIERS = {
  small:  { label: 'Speed Boost!',  color: '#00e5ff', speedAdd: 80,  emoji: '💨', coins: [1,9]    },
  medium: { label: 'Turbo!',        color: '#ffd600', speedAdd: 160, emoji: '⚡', coins: [10,99]   },
  large:  { label: 'Super Turbo!',  color: '#ff6d00', speedAdd: 280, emoji: '🔥', coins: [100,999] },
  mega:   { label: 'MEGA BOOST!',   color: '#ff1744', speedAdd: 500, emoji: '💥', coins: [1000,9999]},
  ultra:  { label: 'ULTRA BOOST!',  color: '#ea80fc', speedAdd: 900, emoji: '🌟', coins: [10000,Infinity]},
};

export function getBoostTier(coins) {
  for (const [id, tier] of Object.entries(BOOST_TIERS)) {
    if (coins >= tier.coins[0] && coins <= tier.coins[1]) return { id, ...tier };
  }
  return { id: 'small', ...BOOST_TIERS.small };
}

// ── World constants ───────────────────────────────────────────────────────
export const SLOPE_ANGLE_DEG = 20;          // incline angle
const SLOPE_RAD  = (SLOPE_ANGLE_DEG * Math.PI) / 180;
const GRAVITY    = 480;                     // px/s²
const GRAV_ALONG = GRAVITY * Math.sin(SLOPE_RAD); // gravity component down slope
const GRAV_PERP  = GRAVITY * Math.cos(SLOPE_RAD); // normal force component
const BASE_CLIMB = 220;                     // px/s initial up-slope speed (from launch)
const FRICTION   = 0.994;                  // rolling friction per tick
const RAGDOLL_MS = 1800;                   // ms in ragdoll before recovery
const TICK_MS    = 16;
const BALL_R     = 16;                     // px

// Cannon configs — placed at slope distances (px) along slope
function buildCannons(difficulty = 1) {
  return [
    { id: 0, slopeDist: 400,  fireInterval: 2800, nextFire: 2000, type: 'standard',  telegraph: 0 },
    { id: 1, slopeDist: 800,  fireInterval: 2200, nextFire: 1000, type: 'standard',  telegraph: 0 },
    { id: 2, slopeDist: 1200, fireInterval: 3200, nextFire: 1500, type: 'bouncy',    telegraph: 0 },
    { id: 3, slopeDist: 1700, fireInterval: 1800, nextFire: 800,  type: 'standard',  telegraph: 0 },
    { id: 4, slopeDist: 2200, fireInterval: 2600, nextFire: 600,  type: 'explosive', telegraph: 0 },
    { id: 5, slopeDist: 2800, fireInterval: 1600, nextFire: 400,  type: 'standard',  telegraph: 0 },
    { id: 6, slopeDist: 3400, fireInterval: 2000, nextFire: 1200, type: 'bouncy',    telegraph: 0 },
    { id: 7, slopeDist: 4200, fireInterval: 1400, nextFire: 800,  type: 'explosive', telegraph: 0 },
  ];
}

// Projectile types
const PROJ_DEFS = {
  standard:  { r: 12, mass: 2.0, knockback: 1.0,  color: '#cc3300', speed: 340, bounces: 0 },
  bouncy:    { r: 10, mass: 1.2, knockback: 0.7,  color: '#7c4dff', speed: 280, bounces: 3 },
  explosive: { r: 14, mass: 3.0, knockback: 2.2,  color: '#ff6d00', speed: 300, bounces: 0, aoe: 80 },
};

export function useCannonEngine() {
  // ── State ───────────────────────────────────────────────────────────────
  const [phase, setPhase]             = useState('idle'); // idle|aiming|climbing|ragdoll|landed
  const [angle, setAngle]             = useState(45);     // cannon barrel angle display
  const [ballSlopeDist, setBallSlopeDist] = useState(0); // distance along slope (px)
  const [ballPerp, setBallPerp]       = useState(0);     // distance perpendicular to slope (bounce)
  const [cameraOffset, setCameraOffset] = useState(0);   // camera pan along slope
  const [distance, setDistance]       = useState(0);     // best distance this run (metres)
  const [topDistance, setTopDistance] = useState(0);
  const [activeBoost, setActiveBoost] = useState(null);
  const [boostQueue, setBoostQueue]   = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [explosions, setExplosions]   = useState([]);
  const [cannons, setCannons]         = useState(() => buildCannons());
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastShooter, setLastShooter] = useState(null);
  const [roundCount, setRoundCount]   = useState(0);
  const [ragdollTimer, setRagdollTimer] = useState(0);
  const [safeZones]                   = useState([600, 1400, 2400, 3600]); // sx values with alcoves

  // ── Refs ────────────────────────────────────────────────────────────────
  const phaseRef    = useRef('idle');
  const ballRef     = useRef({ sx: 0, py: 0, vx: 0, vy: 0 }); // sx=along slope, py=perp
  const projRef     = useRef([]);
  const cannonRef   = useRef(buildCannons());
  const boostRef    = useRef([]);
  const timerRef    = useRef(null);
  const wobbleRef   = useRef(null);
  const shooterRef  = useRef('host');
  const ragdollRef  = useRef(0);
  const projIdRef   = useRef(0);

  const stopAll = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (wobbleRef.current) { clearInterval(wobbleRef.current); wobbleRef.current = null; }
  }, []);

  // ── Wobble then launch ──────────────────────────────────────────────────
  const startWobble = useCallback((shooter = 'host') => {
    const p = phaseRef.current;
    if (p === 'climbing' || p === 'aiming' || p === 'ragdoll') return;
    shooterRef.current = shooter;
    setPhase('aiming'); phaseRef.current = 'aiming';
    cannonRef.current = buildCannons();
    setCannons(buildCannons());
    projRef.current = [];
    setProjectiles([]);
    ballRef.current = { sx: 0, py: 0, vx: 0, vy: 0 };
    setBallSlopeDist(0); setBallPerp(0); setCameraOffset(0); setDistance(0);

    // Drain boost queue for launch speed bonus
    const queue = boostRef.current;
    const speedBonus = queue.reduce((s, b) => s + b.speedAdd, 0);
    const lastBoost  = queue[queue.length - 1] ?? null;
    boostRef.current = []; setBoostQueue([]);
    if (lastBoost) { setActiveBoost(lastBoost); setTimeout(() => setActiveBoost(null), 2000); }

    const launchSpeed = BASE_CLIMB + speedBonus;
    const start = Date.now();
    const WOBBLE_DUR = 1500;

    wobbleRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const t = elapsed / WOBBLE_DUR;
      if (elapsed >= WOBBLE_DUR) {
        clearInterval(wobbleRef.current); wobbleRef.current = null;
        ballRef.current = { sx: 0, py: 0, vx: launchSpeed, vy: 0 };
        setRoundCount(n => n + 1);
        setLastShooter(shooter);
        setPhase('climbing'); phaseRef.current = 'climbing';
        runGameLoop(shooter);
        return;
      }
      // Sweep barrel up and down
      const sweep = 20 + Math.sin(t * Math.PI * 5) * 20 * (1 - t * 0.4);
      setAngle(Math.max(5, Math.min(60, Math.round(sweep))));
    }, 30);
  }, []);

  // ── Main game loop ──────────────────────────────────────────────────────
  const runGameLoop = useCallback((shooter) => {
    stopAll();
    const dt = TICK_MS / 1000;
    let elapsed = 0;

    timerRef.current = setInterval(() => {
      elapsed += TICK_MS;
      const p = phaseRef.current;
      if (p === 'idle' || p === 'landed') { stopAll(); return; }

      let { sx, py, vx, vy } = ballRef.current;
      const isRagdoll = p === 'ragdoll';

      // ── Ball physics ──
      if (isRagdoll) {
        // Ragdoll: full 2D physics, slides back down slope
        vx -= GRAV_ALONG * dt * 1.5; // gravity pulls down slope
        vx *= 0.98;
        vy -= GRAVITY * 0.3 * dt;    // some vertical
        sx += vx * dt;
        py += vy * dt;
        if (py < 0) { py = 0; vy = -vy * 0.3; }
        if (sx < 0) {
          // Rolled back to bottom — landed
          stopAll();
          const dist = Math.round(Math.max(0, ballRef.current.sx) / 10);
          setPhase('landed'); phaseRef.current = 'landed';
          setBallSlopeDist(0); setBallPerp(0);
          setDistance(dist);
          setTopDistance(prev => Math.max(prev, dist));
          setLeaderboard(prev =>
            [{ user: shooter, distance: dist, ts: Date.now() }, ...prev]
              .sort((a,b) => b.distance - a.distance).slice(0, 10)
          );
          return;
        }
        ragdollRef.current += TICK_MS;
        setRagdollTimer(ragdollRef.current);
        if (ragdollRef.current >= RAGDOLL_MS) {
          ragdollRef.current = 0;
          vx = Math.max(0, vx); // face upward after recovery
          setPhase('climbing'); phaseRef.current = 'climbing';
        }
      } else {
        // Normal climbing
        vx -= GRAV_ALONG * dt;  // gravity pulls backward along slope
        vx *= FRICTION;
        sx += vx * dt;
        // Bounce perpendicular dies out
        vy -= GRAVITY * 0.5 * dt;
        py += vy * dt;
        if (py < 0) { py = 0; vy = 0; }

        // Ball stopped or rolled back
        if (vx < 5 && sx < 5) {
          stopAll();
          const dist = Math.round(Math.max(0, sx) / 10);
          setPhase('landed'); phaseRef.current = 'landed';
          setDistance(dist);
          setTopDistance(prev => Math.max(prev, dist));
          setLeaderboard(prev =>
            [{ user: shooter, distance: dist, ts: Date.now() }, ...prev]
              .sort((a,b) => b.distance - a.distance).slice(0, 10)
          );
          return;
        }
      }

      // ── Cannon logic — fire projectiles ──
      const newCannons = cannonRef.current.map(c => {
        let { nextFire, telegraph, ...rest } = c;
        nextFire -= TICK_MS;
        if (telegraph > 0) telegraph -= TICK_MS;

        if (nextFire <= 500 && telegraph === 0) {
          telegraph = 500; // 0.5s warning flash
        }
        if (nextFire <= 0) {
          // Fire!
          nextFire = c.fireInterval + Math.floor(Math.random() * 400 - 200);
          telegraph = 0;
          const def = PROJ_DEFS[c.type];
          const id = projIdRef.current++;
          // Projectile moves down the slope from cannon position
          const newProj = {
            id, type: c.type, cannonId: c.id,
            sx: c.slopeDist, py: 0,
            vx: -(def.speed + Math.random() * 60), // down-slope
            vy: 0,
            r: def.r, mass: def.mass, knockback: def.knockback,
            color: def.color, aoe: def.aoe ?? 0,
            bounces: def.bounces, bouncesLeft: def.bounces,
            active: true,
          };
          projRef.current = [...projRef.current, newProj];
        }
        return { ...rest, nextFire, telegraph };
      });
      cannonRef.current = newCannons;
      setCannons([...newCannons]);

      // ── Move projectiles ──
      let newProjs = projRef.current.map(proj => {
        if (!proj.active) return proj;
        let { sx: psx, py: ppy, vx: pvx, vy: pvy, bouncesLeft } = proj;
        pvx -= GRAV_ALONG * dt * 0.5; // slight gravity on projectile too
        pvy -= GRAVITY * dt * 0.15;
        psx += pvx * dt;
        ppy += pvy * dt;
        if (ppy < 0) {
          ppy = 0;
          if (bouncesLeft > 0) { pvy = -pvy * 0.6; bouncesLeft--; }
          else { pvy = 0; }
        }
        // Off screen left = despawn (de-spawner volume)
        if (psx < -100) return { ...proj, active: false };
        return { ...proj, sx: psx, py: ppy, vx: pvx, vy: pvy, bouncesLeft };
      }).filter(p => p.active);

      // ── Collision detection — ball vs projectiles ──
      if (p === 'climbing') {
        const collided = newProjs.find(proj => {
          const dx = Math.abs(proj.sx - sx);
          const dy = Math.abs(proj.py - py);
          return dx < (BALL_R + proj.r) && dy < (BALL_R + proj.r);
        });

        if (collided) {
          const def = PROJ_DEFS[collided.type];
          // Vfinal = Vplayer + (Vball × KnockbackModifier)
          const kbForce = collided.vx * collided.knockback * 1.4;
          vx += kbForce;  // negative = pushed backward down slope
          vy += Math.abs(collided.vy ?? 0) * 0.5 + 60;
          py  = Math.max(0, py + 10);

          // AOE explosive
          if (collided.aoe) {
            const expId = Date.now();
            setExplosions(prev => [...prev, { id: expId, sx: collided.sx, py: collided.py, r: collided.aoe, color: collided.color }]);
            setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== expId)), 700);
          }

          newProjs = newProjs.filter(p => p.id !== collided.id);
          setActiveBoost({ emoji: '💥', label: 'HIT! KNOCKBACK!', color: '#ff1744', user: null });
          setTimeout(() => setActiveBoost(null), 1000);

          // Enter ragdoll
          ragdollRef.current = 0;
          setPhase('ragdoll'); phaseRef.current = 'ragdoll';
        }
      }

      projRef.current = newProjs;
      ballRef.current = { sx: Math.max(0, sx), py: Math.max(0, py), vx, vy };
      setBallSlopeDist(Math.max(0, sx));
      setBallPerp(Math.max(0, py));
      setProjectiles([...newProjs]);
      setDistance(Math.round(Math.max(0, sx) / 10));

      // Camera follows ball
      setCameraOffset(Math.max(0, sx - 260));

    }, TICK_MS);
  }, [stopAll]);

  // ── Gift handling ───────────────────────────────────────────────────────
  const processGift = useCallback((user, coins) => {
    const tier = getBoostTier(coins);
    const boost = { ...tier, user, coins };
    const p = phaseRef.current;
    if (p === 'climbing') {
      // Immediate speed boost during climb
      ballRef.current.vx += boost.speedAdd;
      setActiveBoost(boost);
      setTimeout(() => setActiveBoost(null), 1500);
    } else if (p === 'ragdoll') {
      // Recovery boost — speeds recovery & adds speed
      ballRef.current.vx += boost.speedAdd * 0.5;
    } else {
      boostRef.current = [...boostRef.current, boost];
      setBoostQueue([...boostRef.current]);
      if (p === 'idle' || p === 'landed') {
        setTimeout(() => startWobble(user), 200);
      }
    }
  }, [startWobble]);

  const manualFire = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'idle' || p === 'landed') startWobble('host');
  }, [startWobble]);

  const reset = useCallback(() => {
    stopAll();
    setPhase('idle'); phaseRef.current = 'idle';
    ballRef.current = { sx: 0, py: 0, vx: 0, vy: 0 };
    setBallSlopeDist(0); setBallPerp(0); setCameraOffset(0);
    setDistance(0); setAngle(45);
    boostRef.current = []; setBoostQueue([]);
    setActiveBoost(null); setExplosions([]);
    projRef.current = []; setProjectiles([]);
    cannonRef.current = buildCannons(); setCannons(buildCannons());
    ragdollRef.current = 0; setRagdollTimer(0);
  }, [stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  return {
    phase, angle, ballSlopeDist, ballPerp, cameraOffset,
    distance, topDistance, activeBoost, boostQueue,
    projectiles, explosions, cannons, safeZones,
    leaderboard, lastShooter, roundCount, ragdollTimer,
    manualFire, reset, processGift,
  };
}

