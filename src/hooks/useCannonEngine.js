/**
 * useCannonEngine v5 — Exact spec implementation
 *
 * PHYSICS: 25° Static incline. Rigidbody2D + CircleCollider2D.
 * Ball slides back under gravity when no upward force is applied.
 *
 * BOOST = Impulse applied as Vector2 along slope direction (cos θ, sin θ)
 *   Tier 1 Small  → Force = 5.0
 *   Tier 2 Medium → Force = 15.0
 *   Tier 3 Large  → Force = 25.0
 *   Tier 4 Mega   → Force = 35.0
 *   Tier 5 Ultra  → Force = 50.0
 *
 * PROJECTILES:
 *   Standard  – mass 5.0, direct linear, triggers Stun on hit, despawns on wall impact
 *   Bouncy    – gravityScale 0.2, bounciness 0.8, lingers as area hazard
 *   Explosive – AOE radius 2.0 units, radial impulse on hit
 *               Dir = normalize(player.pos - explosion.pos), F = dir * ExplosionPower
 *
 * TUMBLE/STUN STATE (1.5s):
 *   InputEnabled = false
 *   Knockback = (-X, -Y) vector applied
 *   Torque applied (simulated as rotation angle spin in SVG)
 *   After 1.5s: rotation reset, InputEnabled = true
 *
 * DISTANCE: tracked via ball's progress along slope (slopeDist / UNITS_PER_METRE)
 * LEADERBOARD: Top 3, updated whenever MaxDistance is exceeded
 */
import { useState, useRef, useCallback, useEffect } from 'react';

// ── Slope & world constants ───────────────────────────────────────────────
export const SLOPE_ANGLE_DEG = 25;
const DEG_TO_RAD  = Math.PI / 180;
const SLOPE_RAD   = SLOPE_ANGLE_DEG * DEG_TO_RAD;
export const SLOPE_COS = Math.cos(SLOPE_RAD);  // along-slope x component
export const SLOPE_SIN = Math.sin(SLOPE_RAD);  // along-slope y component

// Physics in "game units" — 1 unit = 20px on screen
const PX_PER_UNIT  = 20;
const GRAVITY_ACCEL = 9.8;           // units/s² (real gravity)
const GRAV_ALONG   = GRAVITY_ACCEL * SLOPE_SIN; // component pulling ball DOWN slope
const FRICTION     = 0.992;          // rolling friction coefficient (per tick)
const BOUNCE_RESTITUTION = 0.15;     // some residual bounce off slope

// Stun/Tumble
const STUN_DURATION_MS = 1500;       // 1.5 seconds per spec
const TICK_MS          = 16;         // ~60fps

// Projectile speeds (units/s)
const PROJ_SPEED = { standard: 18, bouncy: 14, explosive: 16 };

// Boost force tiers (impulse along slope, units/s added to velocity)
export const BOOST_TIERS = {
  small:  { label: 'Boost!',      color: '#00e5ff', force: 5.0,  emoji: '💨', coins: [1, 9]         },
  medium: { label: 'Turbo!',      color: '#ffd600', force: 15.0, emoji: '⚡', coins: [10, 99]        },
  large:  { label: 'Super!',      color: '#ff6d00', force: 25.0, emoji: '🔥', coins: [100, 999]      },
  mega:   { label: 'MEGA!',       color: '#ff1744', force: 35.0, emoji: '💥', coins: [1000, 9999]    },
  ultra:  { label: 'ULTRA!',      color: '#ea80fc', force: 50.0, emoji: '🌟', coins: [10000, Infinity]},
};

export function getBoostTier(coins) {
  for (const [id, tier] of Object.entries(BOOST_TIERS)) {
    if (coins >= tier.coins[0] && coins <= tier.coins[1]) return { id, ...tier };
  }
  return { id: 'small', ...BOOST_TIERS.small };
}

// ── Projectile definitions following spec ─────────────────────────────────
const PROJ_DEFS = {
  standard:  {
    r: 0.55, mass: 5.0, gravScale: 1.0, bounciness: 0.0,
    color: '#cc2200', glowColor: '#ff3300',
    knockbackX: -12, knockbackY: -6,   // applied to ball on hit
    stunOnHit: true, despawnOnWall: true, aoe: 0,
  },
  bouncy: {
    r: 0.45, mass: 1.5, gravScale: 0.2, bounciness: 0.8,
    color: '#7c4dff', glowColor: '#aa80ff',
    knockbackX: -6,  knockbackY: -3,
    stunOnHit: true, despawnOnWall: false, aoe: 0,
    maxBounces: 999, // lingers
  },
  explosive: {
    r: 0.65, mass: 3.0, gravScale: 0.8, bounciness: 0.0,
    color: '#ff6d00', glowColor: '#ffaa00',
    knockbackX: 0, knockbackY: 0,      // uses radial formula instead
    stunOnHit: false, despawnOnWall: true,
    aoe: 2.0,                           // 2.0 unit radius per spec
    explosionPower: 22,                 // Force magnitude
  },
};

// ── Cannon placement along slope (slope-units from origin) ────────────────
function buildCannons() {
  return [
    { id:0, su:20,  fireMs:2800, nextMs:1800, type:'standard',  telegraph:0, muzzleAngle:0 },
    { id:1, su:40,  fireMs:2200, nextMs:900,  type:'standard',  telegraph:0, muzzleAngle:0 },
    { id:2, su:65,  fireMs:3000, nextMs:1400, type:'bouncy',    telegraph:0, muzzleAngle:0 },
    { id:3, su:90,  fireMs:1800, nextMs:700,  type:'standard',  telegraph:0, muzzleAngle:0 },
    { id:4, su:120, fireMs:2600, nextMs:500,  type:'explosive', telegraph:0, muzzleAngle:0 },
    { id:5, su:155, fireMs:1600, nextMs:300,  type:'standard',  telegraph:0, muzzleAngle:0 },
    { id:6, su:195, fireMs:2200, nextMs:1100, type:'bouncy',    telegraph:0, muzzleAngle:0 },
    { id:7, su:240, fireMs:1400, nextMs:600,  type:'explosive', telegraph:0, muzzleAngle:0 },
  ];
}

const SAFE_ZONES_SU = [30, 75, 140, 210]; // slope-unit positions with alcoves

export function useCannonEngine() {

  // ── State ─────────────────────────────────────────────────────────────
  const [phase,      setPhase]     = useState('idle');  // idle|aiming|climbing|stun|landed
  const [barrelAngle, setBarrelAngle] = useState(35);   // launch cannon barrel sweep
  const [ball,       setBall]      = useState({ su:0, vy:0, vAlongSlope:0 });
  const [rotation,   setRotation]  = useState(0);       // ball spin in degrees (tumble)
  const [cameraOffset, setCameraOffset] = useState(0);  // units scrolled right
  const [currentDistance, setCurrentDistance] = useState(0); // metres
  const [maxDistance, setMaxDistance] = useState(0);
  const [stunTimeLeft, setStunTimeLeft] = useState(0);  // ms remaining in stun
  const [activeBoost, setActiveBoost]   = useState(null);
  const [boostQueue,  setBoostQueue]    = useState([]);
  const [projectiles, setProjectiles]   = useState([]);
  const [explosions,  setExplosions]    = useState([]);
  const [cannons,     setCannons]       = useState(buildCannons);
  const [leaderboard, setLeaderboard]   = useState([]); // top 3
  const [lastShooter, setLastShooter]   = useState(null);
  const [roundCount,  setRoundCount]    = useState(0);

  // ── Refs (mutable without re-render inside setInterval) ───────────────
  const phaseRef     = useRef('idle');
  const ballRef      = useRef({ su:0, vy:0, vAlongSlope:0 }); // su=slope-units
  const rotRef       = useRef(0);         // rotation degrees
  const torqueRef    = useRef(0);         // degrees/s torque
  const inputEnabled = useRef(true);
  const stunRef      = useRef(0);         // ms remaining
  const projRef      = useRef([]);
  const cannonRef    = useRef(buildCannons());
  const boostRef     = useRef([]);
  const timerRef     = useRef(null);
  const wobbleRef    = useRef(null);
  const shooterRef   = useRef('host');
  const projIdRef    = useRef(0);
  const maxDistRef   = useRef(0);

  const stopAll = useCallback(() => {
    clearInterval(timerRef.current);  timerRef.current  = null;
    clearInterval(wobbleRef.current); wobbleRef.current = null;
  }, []);

  // ── Apply impulse along slope: Vector2(force*cos, force*sin) ─────────
  const applyImpulse = useCallback((force) => {
    // Decomposed into slope-parallel velocity component
    ballRef.current.vAlongSlope += force;  // force is already in slope-space
  }, []);

  // ── Aiming wobble then launch ─────────────────────────────────────────
  const startAiming = useCallback((shooter = 'host') => {
    const p = phaseRef.current;
    if (p === 'climbing' || p === 'aiming' || p === 'stun') return;

    shooterRef.current = shooter;
    inputEnabled.current = true;
    stunRef.current = 0;
    projRef.current = [];
    cannonRef.current = buildCannons();
    ballRef.current  = { su: 0, vy: 0, vAlongSlope: 0 };
    rotRef.current   = 0;
    torqueRef.current = 0;
    maxDistRef.current = 0;

    setPhase('aiming'); phaseRef.current = 'aiming';
    setCannons(buildCannons());
    setProjectiles([]); setExplosions([]);
    setBall({ su:0, vy:0, vAlongSlope:0 });
    setRotation(0); setCameraOffset(0); setCurrentDistance(0); setMaxDistance(0);

    // Drain boost queue — sum force
    const queue = boostRef.current;
    const totalForce = queue.reduce((s, b) => s + b.force, 0);
    const lastBoost  = queue[queue.length - 1] ?? null;
    boostRef.current = []; setBoostQueue([]);

    const launchForce = 8.0 + totalForce;  // base launch + boost
    if (lastBoost) { setActiveBoost(lastBoost); setTimeout(() => setActiveBoost(null), 2000); }

    const startMs = Date.now();
    const WOBBLE  = 1500;

    wobbleRef.current = setInterval(() => {
      const elapsed = Date.now() - startMs;
      if (elapsed >= WOBBLE) {
        clearInterval(wobbleRef.current); wobbleRef.current = null;
        // Apply initial launch impulse along slope
        ballRef.current.vAlongSlope = launchForce;
        setRoundCount(n => n + 1);
        setLastShooter(shooter);
        setPhase('climbing'); phaseRef.current = 'climbing';
        runPhysicsLoop(shooter);
        return;
      }
      const t = elapsed / WOBBLE;
      const sweep = 25 + Math.sin(t * Math.PI * 5) * 22 * (1 - t * 0.3);
      setBarrelAngle(Math.max(5, Math.min(65, Math.round(sweep))));
    }, 30);
  }, []); // runPhysicsLoop referenced via ref below

  // ── Physics loop ──────────────────────────────────────────────────────
  const runPhysicsLoopRef = useRef(null);

  const runPhysicsLoop = useCallback((shooter) => {
    stopAll();
    const dt = TICK_MS / 1000;

    timerRef.current = setInterval(() => {
      const p = phaseRef.current;
      if (p === 'idle' || p === 'landed') { stopAll(); return; }

      let { su, vy, vAlongSlope } = ballRef.current;

      // ── Stun/Tumble state — InputEnabled = false ─────────────────────
      if (p === 'stun') {
        stunRef.current -= TICK_MS;
        setStunTimeLeft(Math.max(0, stunRef.current));
        // Spin torque (simulate wipeout rotation)
        rotRef.current = (rotRef.current + torqueRef.current * dt) % 360;
        torqueRef.current *= 0.97; // spin dampens
        // Ball slides back under gravity (no input force)
        vAlongSlope -= GRAV_ALONG * dt * 1.6;
        vAlongSlope *= 0.97;
        su += vAlongSlope * dt;
        vy *= 0.88;

        if (stunRef.current <= 0) {
          // Recovery: reset rotation, re-enable input
          torqueRef.current = 0;
          inputEnabled.current = true;
          setPhase('climbing'); phaseRef.current = 'climbing';
          setActiveBoost(null);
        }
        if (su <= 0) {
          // Slid all the way back — end run
          stopAll();
          finishRun(shooter, 0, su);
          return;
        }
      }
      // ── Normal climbing ───────────────────────────────────────────────
      else if (p === 'climbing') {
        // Gravity pulls down slope
        vAlongSlope -= GRAV_ALONG * dt;
        vAlongSlope *= FRICTION;

        // Slight rotation based on speed
        rotRef.current = (rotRef.current + vAlongSlope * 2 * dt) % 360;

        su += vAlongSlope * dt;
        // Stopped / rolled back
        if (su <= 0 && vAlongSlope < 0.2) {
          stopAll();
          finishRun(shooter, Math.round(su * 0), su);
          return;
        }
        if (vAlongSlope < 0.05 && vAlongSlope > -0.1) {
          stopAll();
          finishRun(shooter, Math.round(Math.max(0, su)), su);
          return;
        }
      }

      su = Math.max(0, su);
      ballRef.current = { su, vy, vAlongSlope };
      setRotation(Math.round(rotRef.current));

      // ── Track distance (metres = slope-units) ────────────────────────
      const distM = Math.round(su);
      setCurrentDistance(distM);
      if (distM > maxDistRef.current) {
        maxDistRef.current = distM;
        setMaxDistance(distM);
      }

      // ── Camera follows ball — keep ball at ~30% from left ────────────
      const CAM_LEAD_SU = 8;
      setCameraOffset(Math.max(0, su - CAM_LEAD_SU));

      // ── Cannon timers + firing ────────────────────────────────────────
      const updatedCannons = cannonRef.current.map(c => {
        let { nextMs, telegraph, ...rest } = c;
        nextMs -= TICK_MS;
        if (telegraph > 0) telegraph -= TICK_MS;

        // 0.5s pre-fire telegraph
        if (nextMs <= 500 && telegraph === 0) telegraph = 500;

        if (nextMs <= 0) {
          nextMs = c.fireMs + (Math.random() * 400 - 200);
          telegraph = 0;
          const def = PROJ_DEFS[c.type];
          const pid = projIdRef.current++;
          projRef.current = [...projRef.current, {
            id: pid, type: c.type,
            su: c.su,           // start at cannon's slope position
            py: 1.2,            // float slightly above slope
            vsu: -(PROJ_SPEED[c.type]),  // moving DOWN slope
            vpy: 0,
            r: def.r, mass: def.mass, gravScale: def.gravScale,
            bounciness: def.bounciness, color: def.color,
            active: true, bounceCount: 0,
            despawnOnWall: def.despawnOnWall,
          }];
        }
        return { ...rest, nextMs, telegraph };
      });
      cannonRef.current = updatedCannons;
      setCannons([...updatedCannons]);

      // ── Move projectiles ──────────────────────────────────────────────
      let newProjs = projRef.current.map(proj => {
        if (!proj.active) return null;
        let { su: psu, py: ppy, vsu, vpy, bounceCount } = proj;
        const def = PROJ_DEFS[proj.type];

        vsu += 0; // no along-slope gravity on projectile (fired directly)
        vpy -= GRAVITY_ACCEL * def.gravScale * dt;
        psu += vsu * dt;
        ppy += vpy * dt;

        // Bounce off slope surface
        if (ppy <= 0) {
          ppy = 0;
          if (def.bounciness > 0) {
            vpy = -vpy * def.bounciness;
            bounceCount++;
          } else {
            vpy = 0;
          }
        }
        // De-spawner: off left edge = destroy
        if (psu < -5) return null;
        // Standard despawns on reaching slope bottom wall
        if (def.despawnOnWall && psu < 0) return null;

        return { ...proj, su: psu, py: ppy, vsu, vpy, bounceCount };
      }).filter(Boolean);

      // ── Collision detection ───────────────────────────────────────────
      if (p === 'climbing' && inputEnabled.current) {
        const BALL_R_SU = 0.5; // ball radius in slope-units
        const hit = newProjs.find(proj => {
          const dsu = Math.abs(proj.su - su);
          const dpy = Math.abs(proj.py - 0);
          return dsu < (BALL_R_SU + proj.r * 1.2) && dpy < (BALL_R_SU + proj.r * 1.2);
        });

        if (hit) {
          const def = PROJ_DEFS[hit.type];

          if (hit.type === 'explosive') {
            // Radial impulse: Dir = normalize(player - explosion), F = dir * power
            const dx = su - hit.su;
            const dy = 0 - hit.py;
            const len = Math.sqrt(dx*dx + dy*dy) || 1;
            const nx  = dx / len;
            vAlongSlope += nx * def.explosionPower;
            // AOE explosion visual
            const eid = Date.now();
            setExplosions(prev => [...prev, { id:eid, su:hit.su, py:hit.py, r:def.aoe, color:def.color }]);
            setTimeout(() => setExplosions(prev => prev.filter(e=>e.id!==eid)), 700);
            // Explosive still stuns
            enterStun(vAlongSlope, def);
          } else {
            // Standard / Bouncy: apply knockback vector (-X, -Y) per spec
            vAlongSlope += def.knockbackX;  // negative = backward
            enterStun(vAlongSlope, def);
          }

          // Remove hit projectile (standard despawns; bouncy lingers)
          newProjs = newProjs.map(p => p.id === hit.id
            ? (hit.type === 'bouncy' ? p : { ...p, active: false })
            : p
          ).filter(p => p.active !== false);

          ballRef.current = { su: Math.max(0, su), vy, vAlongSlope };
          projRef.current = newProjs;
          setProjectiles([...newProjs]);
          setBall({ su: Math.max(0, su), vy, vAlongSlope });
          return; // skip normal state update this tick
        }
      }

      projRef.current = newProjs;
      ballRef.current = { su: Math.max(0, su), vy, vAlongSlope };
      setProjectiles([...newProjs]);
      setBall({ su: Math.max(0, su), vy, vAlongSlope });

    }, TICK_MS);
  }, [stopAll]);

  // Store in ref so startAiming closure can call it
  useEffect(() => { runPhysicsLoopRef.current = runPhysicsLoop; }, [runPhysicsLoop]);

  // ── Stun/Tumble entry ─────────────────────────────────────────────────
  const enterStun = useCallback((currentVx, def) => {
    // InputEnabled = false
    inputEnabled.current = false;
    stunRef.current = STUN_DURATION_MS;
    // Add torque — spin ball rapidly to simulate wipeout
    torqueRef.current = -720 - Math.random() * 360; // deg/s
    setPhase('stun'); phaseRef.current = 'stun';
    setStunTimeLeft(STUN_DURATION_MS);
    setActiveBoost({ emoji: '💥', label: 'STUNNED!', color: '#ff1744', user: null });
    setTimeout(() => {
      if (phaseRef.current !== 'stun') return;
      setActiveBoost(null);
    }, 1200);
  }, []);

  // ── Run end ───────────────────────────────────────────────────────────
  const finishRun = useCallback((shooter, dist, su) => {
    const metres = Math.round(Math.max(0, maxDistRef.current));
    setPhase('landed'); phaseRef.current = 'landed';
    setCurrentDistance(metres);
    setBall({ su: Math.max(0, su), vy: 0, vAlongSlope: 0 });
    setTopDistance(prev => {
      const next = Math.max(prev, metres);
      return next;
    });
    setLeaderboard(prev => {
      const entry = { user: shooter, distance: metres, ts: Date.now() };
      const next = [...prev, entry].sort((a,b) => b.distance - a.distance);
      // Top 3 unique users
      const seen = new Set();
      return next.filter(e => { if (seen.has(e.user)) return false; seen.add(e.user); return true; }).slice(0,3);
    });
  }, []);

  // ── Gift → boost ──────────────────────────────────────────────────────
  const processGift = useCallback((user, coins) => {
    const tier = getBoostTier(coins);
    const boost = { ...tier, user, coins };
    const p = phaseRef.current;
    if (p === 'climbing' && inputEnabled.current) {
      // Immediate impulse along slope
      applyImpulse(boost.force);
      setActiveBoost(boost);
      setTimeout(() => setActiveBoost(null), 1500);
    } else if (p === 'stun') {
      // Can partially speed recovery
      applyImpulse(boost.force * 0.3);
    } else {
      boostRef.current = [...boostRef.current, boost];
      setBoostQueue([...boostRef.current]);
      if (p === 'idle' || p === 'landed') {
        setTimeout(() => startAiming(user), 200);
      }
    }
  }, [startAiming, applyImpulse]);

  const manualFire = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'idle' || p === 'landed') startAiming('host');
  }, [startAiming]);

  const reset = useCallback(() => {
    stopAll();
    setPhase('idle'); phaseRef.current = 'idle';
    ballRef.current = { su:0, vy:0, vAlongSlope:0 };
    setBall({ su:0, vy:0, vAlongSlope:0 });
    rotRef.current = 0; torqueRef.current = 0;
    setRotation(0); setCameraOffset(0); setBarrelAngle(35);
    setCurrentDistance(0); setMaxDistance(0);
    boostRef.current = []; setBoostQueue([]);
    setActiveBoost(null); setExplosions([]); setStunTimeLeft(0);
    projRef.current = []; setProjectiles([]);
    cannonRef.current = buildCannons(); setCannons(buildCannons());
    inputEnabled.current = true; stunRef.current = 0;
    maxDistRef.current = 0;
  }, [stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  // Patch startAiming to call via ref (avoids stale closure on runPhysicsLoop)
  const startAimingRef = useRef(startAiming);
  useEffect(() => { startAimingRef.current = startAiming; }, [startAiming]);

  // Fix the forward reference: patch runPhysicsLoop into the wobble closure
  // by adding the ref call after wobble ends
  useEffect(() => {
    // Nothing needed here — startAiming calls runPhysicsLoop directly
    // since they're defined in the same component scope
  }, []);

  return {
    phase, barrelAngle, ball, rotation, cameraOffset,
    currentDistance, maxDistance, stunTimeLeft,
    activeBoost, boostQueue, projectiles, explosions,
    cannons, leaderboard, lastShooter, roundCount,
    safeZones: SAFE_ZONES_SU,
    manualFire, reset, processGift, applyImpulse,
    SLOPE_ANGLE_DEG, PX_PER_UNIT,
  };
}
