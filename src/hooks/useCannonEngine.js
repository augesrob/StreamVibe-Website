/**
 * useCannonEngine v6 — Ball Guys Cannon Climb
 *
 * COORDINATE SYSTEM: Everything in Slope Units (SU).
 *   su  = distance along the 25° incline (X-axis of slope space)
 *   py  = height perpendicular to incline (Y-axis of slope space)
 *   s2c(su, py, camSU) in CannonGame.jsx maps → canvas pixels
 *
 * PLAYER PHYSICS:
 *   GravitySlope = g × sin(25°) always pulls velocity.su negative
 *   Rolling resistance: velocity.su decays toward negative when no boost active
 *   Boost: immediate impulse added to velocity.su
 *
 * STUN STATE (1.5s):
 *   InputEnabled = false
 *   High angularVelocity set → ball spins visually
 *   Knockback: projectile.mass subtracts from velocity.su (significant)
 *   After 1.5s: InputEnabled = true, angularVelocity reset
 *
 * PROJECTILES (match PROJ_INFO):
 *   standard  — high mass, disappears on hit, triggers stun
 *   bouncy    — high restitution (0.8), bounces off ball, STAYS ACTIVE as hazard
 *   explosive — dist(ball.su, proj.su) < 2.0 SU → radial force away from center
 *
 * CAMERA: lerps toward ball su each tick (smooth follow + scrolls back on knockback)
 *
 * LEADERBOARD: Top 3, updates whenever MaxDistance exceeded
 */
import { useState, useRef, useCallback, useEffect } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────
export const SLOPE_ANGLE_DEG = 25;
const RAD        = (SLOPE_ANGLE_DEG * Math.PI) / 180;
export const SLOPE_COS = Math.cos(RAD);
export const SLOPE_SIN = Math.sin(RAD);

const G            = 9.8;                   // m/s² real gravity
const GRAV_SLOPE   = G * Math.sin(RAD);     // = 9.8 × sin(25°) ≈ 4.14 su/s² down slope
const FRICTION     = 0.993;                 // rolling resistance per tick
const STUN_MS      = 1500;                  // 1.5 s stun per spec
const TICK_MS      = 16;                    // 60 fps
const CAM_LERP     = 0.08;                  // camera smoothing factor (0=instant, 1=no move)
const CAM_LEAD_SU  = 7;                     // how far ahead of ball camera leads

// Boost force tiers — impulse added to velocity.su
export const BOOST_TIERS = {
  small:  { label:'Boost!',      color:'#00e5ff', force:5.0,  emoji:'💨', coins:[1,9]         },
  medium: { label:'Turbo!',      color:'#ffd600', force:15.0, emoji:'⚡', coins:[10,99]        },
  large:  { label:'Super!',      color:'#ff6d00', force:25.0, emoji:'🔥', coins:[100,999]      },
  mega:   { label:'MEGA!',       color:'#ff1744', force:35.0, emoji:'💥', coins:[1000,9999]    },
  ultra:  { label:'ULTRA!',      color:'#ea80fc', force:50.0, emoji:'🌟', coins:[10000,Infinity]},
};
export function getBoostTier(coins) {
  for (const [id, t] of Object.entries(BOOST_TIERS))
    if (coins >= t.coins[0] && coins <= t.coins[1]) return { id, ...t };
  return { id:'small', ...BOOST_TIERS.small };
}

// Projectile definitions (PROJ_INFO)
const PROJ_INFO = {
  standard:  { r:0.55, mass:5.0, gravScale:1.0,  restitution:0.0, color:'#cc2200', speed:18, despawnOnHit:true,  aoe:0    },
  bouncy:    { r:0.45, mass:1.5, gravScale:0.25, restitution:0.8, color:'#7c4dff', speed:14, despawnOnHit:false, aoe:0    },
  explosive: { r:0.65, mass:3.0, gravScale:0.7,  restitution:0.0, color:'#ff6d00', speed:16, despawnOnHit:true,  aoe:2.0, explosionPower:20 },
};

function buildCannons() {
  return [
    { id:0, su:20,  fireMs:2800, nextMs:1800, type:'standard',  telegraph:0 },
    { id:1, su:42,  fireMs:2200, nextMs:900,  type:'standard',  telegraph:0 },
    { id:2, su:68,  fireMs:3000, nextMs:1400, type:'bouncy',    telegraph:0 },
    { id:3, su:95,  fireMs:1800, nextMs:700,  type:'standard',  telegraph:0 },
    { id:4, su:128, fireMs:2600, nextMs:500,  type:'explosive', telegraph:0 },
    { id:5, su:162, fireMs:1600, nextMs:300,  type:'standard',  telegraph:0 },
    { id:6, su:200, fireMs:2200, nextMs:1100, type:'bouncy',    telegraph:0 },
    { id:7, su:245, fireMs:1400, nextMs:600,  type:'explosive', telegraph:0 },
  ];
}
export const SAFE_ZONES_SU = [30, 78, 145, 215];

export function useCannonEngine() {

  // ── React state (drives SVG render) ──────────────────────────────────
  const [phase,           setPhase]          = useState('idle'); // idle|aiming|climbing|stun|landed
  const [barrelAngle,     setBarrelAngle]     = useState(35);
  const [ballSU,          setBallSU]          = useState(0);    // su position
  const [ballPY,          setBallPY]          = useState(0);    // py position
  const [angularVelocity, setAngularVelocity] = useState(0);   // deg/s — drives rotation
  const [rotation,        setRotation]        = useState(0);   // cumulative degrees
  const [camSU,           setCamSU]           = useState(0);   // camera position in SU
  const [currentDistance, setCurrentDistance] = useState(0);
  const [maxDistance,     setMaxDistance]     = useState(0);
  const [stunTimeLeft,    setStunTimeLeft]    = useState(0);
  const [activeBoost,     setActiveBoost]     = useState(null);
  const [boostQueue,      setBoostQueue]      = useState([]);
  const [projectiles,     setProjectiles]     = useState([]);
  const [explosions,      setExplosions]      = useState([]);
  const [cannons,         setCannons]         = useState(buildCannons);
  const [leaderboard,     setLeaderboard]     = useState([]);
  const [roundCount,      setRoundCount]      = useState(0);

  // ── Refs — mutable values used INSIDE setInterval ────────────────────
  const phaseRef      = useRef('idle');
  const velRef        = useRef({ su: 0, py: 0 }); // velocity in slope-units/s
  const posRef        = useRef({ su: 0, py: 0 }); // position in slope-units
  const angVelRef     = useRef(0);                 // deg/s angular velocity
  const rotRef        = useRef(0);                 // accumulated rotation deg
  const camRef        = useRef(0);                 // current camera su (lerped)
  const stunRef       = useRef(0);                 // ms remaining in stun
  const inputRef      = useRef(true);              // InputEnabled
  const maxDistRef    = useRef(0);
  const projRef       = useRef([]);
  const cannonRef     = useRef(buildCannons());
  const boostRef      = useRef([]);
  const timerRef      = useRef(null);
  const wobbleRef     = useRef(null);
  const shooterRef    = useRef('host');
  const pidRef        = useRef(0);

  const stopAll = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (wobbleRef.current) { clearInterval(wobbleRef.current); wobbleRef.current = null; }
  }, []);

  // ── updateTick — the core physics loop ───────────────────────────────
  // Called every TICK_MS. Handles:
  //   1. Slope gravity on ball
  //   2. Rolling resistance (friction)
  //   3. Angular velocity (visual spin)
  //   4. Stun knockback & torque
  //   5. Projectile movement + gravity
  //   6. Collision detection (3 types)
  //   7. Camera lerp
  //   8. Cannon timers + firing
  const updateTick = useCallback((shooter) => {
    const dt = TICK_MS / 1000; // seconds per tick

    return setInterval(() => {
      const p = phaseRef.current;
      if (p === 'idle' || p === 'landed') return;

      let { su, py }   = posRef.current;
      let { su: vsu, py: vpy } = velRef.current;
      let angV = angVelRef.current;

      // ════════════════════════════════════════════════════════
      // 1. SLOPE GRAVITY
      //    GravitySlope = g × sin(25°) pulls ball DOWN the slope.
      //    Applied every tick regardless of phase.
      // ════════════════════════════════════════════════════════
      vsu -= GRAV_SLOPE * dt;

      // 2. PERPENDICULAR gravity (keeps ball on surface)
      vpy -= G * Math.cos(RAD) * dt;
      if (py <= 0 && vpy < 0) { py = 0; vpy = 0; }

      // ════════════════════════════════════════════════════════
      // 3. ROLLING RESISTANCE
      //    If no boost active, velocity.su decays toward negative.
      //    Physics material friction applied only while on surface.
      // ════════════════════════════════════════════════════════
      if (py <= 0.01) vsu *= FRICTION;

      // ════════════════════════════════════════════════════════
      // 4. STUN STATE
      // ════════════════════════════════════════════════════════
      if (p === 'stun') {
        stunRef.current -= TICK_MS;
        setStunTimeLeft(Math.max(0, stunRef.current));

        // High angular velocity — ball spins wildly to show wipeout
        angV *= 0.96;   // spin decays as ball slows
        rotRef.current  = (rotRef.current + angV * dt) % 360;
        angVelRef.current = angV;

        if (stunRef.current <= 0) {
          // Recovery: reset stun, re-enable input
          inputRef.current  = true;
          angVelRef.current = vsu * 15; // back to normal rolling rotation
          setPhase('climbing'); phaseRef.current = 'climbing';
          setActiveBoost(null);
        }
      } else if (p === 'climbing') {
        // 5. ANGULAR VELOCITY during normal rolling
        //    angularVelocity ∝ vsu (ball spins forward when climbing, backward when sliding)
        angVelRef.current = vsu * 15;  // scale to make rotation visible
        rotRef.current = (rotRef.current + angVelRef.current * dt) % 360;
      }

      su += vsu * dt;
      py  = Math.max(0, py + vpy * dt);

      // Boundary checks
      if (su <= 0) {
        // Ball rolled back to start — run over
        stopAll();
        endRun(shooter, su);
        return;
      }

      // ════════════════════════════════════════════════════════
      // 6. CAMERA LERP
      //    Smooth follow: lerp camSU toward (ball.su - CAM_LEAD).
      //    When ball is knocked back, camera follows it DOWN too.
      // ════════════════════════════════════════════════════════
      const targetCam = Math.max(0, su - CAM_LEAD_SU);
      camRef.current  = camRef.current + (targetCam - camRef.current) * CAM_LERP;

      // Commit ball position to refs
      posRef.current = { su, py };
      velRef.current = { su: vsu, py: vpy };

      // ════════════════════════════════════════════════════════
      // 7. CANNON TIMERS + FIRING
      // ════════════════════════════════════════════════════════
      const newCannons = cannonRef.current.map(c => {
        let { nextMs, telegraph } = c;
        nextMs -= TICK_MS;
        if (telegraph > 0) telegraph -= TICK_MS;
        if (nextMs <= 500 && telegraph === 0) telegraph = 500; // pre-fire flash

        if (nextMs <= 0) {
          const def = PROJ_INFO[c.type];
          const pid = pidRef.current++;
          projRef.current = [...projRef.current, {
            id: pid, type: c.type,
            su: c.su, py: 1.0,          // spawns just above slope at cannon pos
            vsu: -(def.speed),           // fires DOWN the slope (negative su direction)
            vpy: 0,
            r: def.r, mass: def.mass, color: def.color,
            gravScale: def.gravScale, restitution: def.restitution,
            despawnOnHit: def.despawnOnHit, aoe: def.aoe ?? 0,
            explosionPower: def.explosionPower ?? 0,
            bounceCount: 0, active: true,
          }];
          nextMs = c.fireMs + (Math.random() * 400 - 200);
          telegraph = 0;
        }
        return { ...c, nextMs, telegraph };
      });
      cannonRef.current = newCannons;

      // ════════════════════════════════════════════════════════
      // 8. MOVE PROJECTILES
      // ════════════════════════════════════════════════════════
      let projs = projRef.current.map(proj => {
        if (!proj.active) return null;
        let { su: psu, py: ppy, vsu: pvsu, vpy: pvpy, bounceCount } = proj;

        // Gravity on projectile (scaled by gravScale)
        pvpy -= G * proj.gravScale * dt;
        psu  += pvsu * dt;
        ppy  += pvpy * dt;

        // Bounce off slope surface
        if (ppy <= 0) {
          ppy = 0;
          if (proj.restitution > 0) {
            pvpy = -pvpy * proj.restitution; // bouncy: high restitution, stays active
            bounceCount++;
          } else {
            pvpy = 0;
          }
        }

        // De-spawner volume: projectile exits left edge → destroy immediately
        if (psu < -3) return null;

        return { ...proj, su: psu, py: ppy, vsu: pvsu, vpy: pvpy, bounceCount };
      }).filter(Boolean);

      // ════════════════════════════════════════════════════════
      // 9. COLLISION DETECTION — only while InputEnabled
      // ════════════════════════════════════════════════════════
      if (inputRef.current && (p === 'climbing' || p === 'stun')) {
        const BALL_R = 0.55; // ball radius in SU

        for (let i = 0; i < projs.length; i++) {
          const proj = projs[i];
          // Distance check (circular collision in slope-space)
          const dsu  = su - proj.su;
          const dpy  = py - proj.py;
          const dist = Math.sqrt(dsu * dsu + dpy * dpy);
          const hitR = BALL_R + proj.r;

          if (dist < hitR) {
            // ── STANDARD: high mass, disappears, triggers stun ──────────
            if (proj.type === 'standard') {
              // Knockback: proj.mass subtracted significantly from velocity.su
              vsu -= proj.mass * 2.2;
              triggerStun(vsu);
              projs = projs.filter(p2 => p2.id !== proj.id); // despawn
            }
            // ── BOUNCY: bounces off ball, stays active as hazard ────────
            else if (proj.type === 'bouncy') {
              // Elastic-ish collision — reverse proj vsu, reduce ball vsu
              projs = projs.map(p2 => p2.id === proj.id
                ? { ...p2, vsu: -p2.vsu * 0.6, vpy: Math.abs(p2.vpy) * 0.5 + 1.5 }
                : p2
              );
              vsu -= proj.mass * 1.2; // lighter knockback, ball keeps moving
              triggerStun(vsu);
            }
            // ── EXPLOSIVE: dist < 2.0 SU → radial impulse ──────────────
            else if (proj.type === 'explosive') {
              // Radial force: Direction = normalize(ball.pos - explosion.pos)
              const len = dist || 0.01;
              const nx  = dsu / len;   // normalized direction su
              const ny  = dpy / len;   // normalized direction py
              const f   = proj.explosionPower;
              vsu += nx * f;           // push ball AWAY from explosion center
              vpy += ny * f;

              // AOE visual
              const eid = Date.now() + Math.random();
              setExplosions(prev => [...prev,
                { id: eid, su: proj.su, py: proj.py, r: proj.aoe, color: proj.color }
              ]);
              setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== eid)), 700);
              triggerStun(vsu);
              projs = projs.filter(p2 => p2.id !== proj.id);
            }

            // Re-commit velocity after collision
            velRef.current = { su: vsu, py: vpy };
            break; // one collision per tick
          }
        }
      }

      projRef.current = projs;

      // ── Commit state to React ─────────────────────────────────────────
      const distM = Math.round(Math.max(0, su));
      if (distM > maxDistRef.current) {
        maxDistRef.current = distM;
        setMaxDistance(distM);
      }

      setBallSU(su);
      setBallPY(py);
      setRotation(Math.round(rotRef.current));
      setAngularVelocity(Math.round(angVelRef.current));
      setCamSU(camRef.current);
      setCurrentDistance(distM);
      setProjectiles([...projs]);
      setCannons([...newCannons]);

    }, TICK_MS);
  }, [stopAll]);

  // ── triggerStun — sets InputEnabled=false, applies torque ────────────
  const triggerStun = useCallback((currentVsu) => {
    inputRef.current = false;
    stunRef.current  = STUN_MS;
    // High angular velocity → ball spins rapidly (tumble/wipeout effect)
    angVelRef.current = (currentVsu < 0 ? 1 : -1) * (600 + Math.random() * 400);
    setPhase('stun'); phaseRef.current = 'stun';
    setStunTimeLeft(STUN_MS);
    setActiveBoost({ emoji:'💥', label:'STUNNED!', color:'#ff1744', user:null });
    setTimeout(() => {
      if (phaseRef.current === 'stun') setActiveBoost(null);
    }, 1000);
  }, []);

  // ── endRun — record distance, update top 3 leaderboard ───────────────
  const endRun = useCallback((shooter, finalSU) => {
    const metres = Math.round(Math.max(0, maxDistRef.current));
    setPhase('landed'); phaseRef.current = 'landed';
    setCurrentDistance(metres);
    setBallSU(Math.max(0, finalSU));
    setMaxDistance(prev => Math.max(prev, metres));
    setLeaderboard(prev => {
      const next = [...prev, { user: shooter, distance: metres, ts: Date.now() }]
        .sort((a, b) => b.distance - a.distance);
      const seen = new Set();
      return next.filter(e => { if (seen.has(e.user)) return false; seen.add(e.user); return true; }).slice(0, 3);
    });
  }, []);

  // ── Aiming wobble → launch ────────────────────────────────────────────
  const startAiming = useCallback((shooter = 'host') => {
    const p = phaseRef.current;
    if (p === 'climbing' || p === 'aiming' || p === 'stun') return;

    shooterRef.current = shooter;
    stopAll();

    // Reset everything
    posRef.current    = { su: 0, py: 0 };
    velRef.current    = { su: 0, py: 0 };
    angVelRef.current = 0;
    rotRef.current    = 0;
    camRef.current    = 0;
    maxDistRef.current = 0;
    inputRef.current  = true;
    stunRef.current   = 0;
    projRef.current   = [];
    cannonRef.current = buildCannons();
    pidRef.current    = 0;

    setPhase('aiming'); phaseRef.current = 'aiming';
    setBallSU(0); setBallPY(0); setRotation(0);
    setCamSU(0); setCurrentDistance(0); setMaxDistance(0);
    setProjectiles([]); setExplosions([]);
    setCannons(buildCannons()); setStunTimeLeft(0);

    // Consume boost queue → sum force for launch impulse
    const queue = boostRef.current;
    const totalForce = queue.reduce((s, b) => s + b.force, 0);
    const lastBoost  = queue[queue.length - 1] ?? null;
    boostRef.current = []; setBoostQueue([]);
    if (lastBoost) { setActiveBoost(lastBoost); setTimeout(() => setActiveBoost(null), 2000); }

    const launchVsu = 8.0 + totalForce; // base 8 SU/s + boost
    const startMs   = Date.now();
    const WOBBLE    = 1500;

    wobbleRef.current = setInterval(() => {
      const elapsed = Date.now() - startMs;
      if (elapsed >= WOBBLE) {
        clearInterval(wobbleRef.current); wobbleRef.current = null;
        // Fire! Apply initial impulse along slope
        velRef.current = { su: launchVsu, py: 0.5 };
        setRoundCount(n => n + 1);
        setPhase('climbing'); phaseRef.current = 'climbing';
        // Start physics loop — stored in ref to avoid stale closure
        timerRef.current = updateTick(shooter);
        return;
      }
      // Barrel sweep animation
      const t     = elapsed / WOBBLE;
      const sweep = 25 + Math.sin(t * Math.PI * 5) * 22 * (1 - t * 0.3);
      setBarrelAngle(Math.max(5, Math.min(65, Math.round(sweep))));
    }, 30);
  }, [stopAll, updateTick]);

  // ── Gift → boost impulse ──────────────────────────────────────────────
  const processGift = useCallback((user, coins) => {
    const tier  = getBoostTier(coins);
    const boost = { ...tier, user, coins };
    const p     = phaseRef.current;

    if (p === 'climbing' && inputRef.current) {
      // Immediate impulse: Vector2 along slope (su direction)
      velRef.current.su += boost.force;
      setActiveBoost(boost);
      setTimeout(() => setActiveBoost(null), 1500);
    } else if (p === 'stun') {
      // Partial recovery boost — reduces knockback speed
      velRef.current.su += boost.force * 0.35;
    } else {
      boostRef.current = [...boostRef.current, boost];
      setBoostQueue([...boostRef.current]);
      if (p === 'idle' || p === 'landed')
        setTimeout(() => startAiming(user), 200);
    }
  }, [startAiming]);

  const manualFire = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'idle' || p === 'landed') startAiming('host');
  }, [startAiming]);

  const reset = useCallback(() => {
    stopAll();
    posRef.current = { su:0, py:0 }; velRef.current = { su:0, py:0 };
    angVelRef.current = 0; rotRef.current = 0; camRef.current = 0;
    inputRef.current = true; stunRef.current = 0; maxDistRef.current = 0;
    projRef.current = []; cannonRef.current = buildCannons(); pidRef.current = 0;
    boostRef.current = [];

    setPhase('idle'); phaseRef.current = 'idle';
    setBallSU(0); setBallPY(0); setRotation(0); setAngularVelocity(0);
    setCamSU(0); setBarrelAngle(35); setCurrentDistance(0); setMaxDistance(0);
    setBoostQueue([]); setActiveBoost(null); setExplosions([]); setStunTimeLeft(0);
    setProjectiles([]); setCannons(buildCannons());
  }, [stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  return {
    // Render state
    phase, barrelAngle, ballSU, ballPY, rotation, angularVelocity, camSU,
    currentDistance, maxDistance, stunTimeLeft,
    activeBoost, boostQueue, projectiles, explosions, cannons,
    leaderboard, roundCount,
    safeZones: SAFE_ZONES_SU,
    // Actions
    manualFire, reset, processGift,
  };
}
