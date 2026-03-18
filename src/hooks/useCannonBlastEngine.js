/**
 * useCannonBlastEngine — core physics + game state for Cannon Blast
 * Ball launches from cannon, gifts from viewers trigger mid-flight boosts.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

// Gift → boost mapping (coin value → effect)
export const GIFT_BOOSTS = [
  { name: 'Speed Burst',  minCoins: 1,    maxCoins: 4,    color: '#00e5ff', emoji: '💨', effect: 'speed',   power: 1.2  },
  { name: 'Double Boost', minCoins: 5,    maxCoins: 49,   color: '#ffd600', emoji: '⚡', effect: 'double',  power: 1.5  },
  { name: 'Super Shot',   minCoins: 50,   maxCoins: 199,  color: '#ff6d00', emoji: '🔥', effect: 'super',   power: 2.0  },
  { name: 'MEGA BLAST',   minCoins: 200,  maxCoins: 99999,color: '#aa00ff', emoji: '💥', effect: 'mega',    power: 3.0  },
];

export function getBoostForCoins(coins) {
  return [...GIFT_BOOSTS].reverse().find(b => coins >= b.minCoins) ?? GIFT_BOOSTS[0];
}

const GRAVITY   = 0.18;
const FRICTION  = 0.995;
const FLOOR_Y   = 520;
const BALL_R    = 22;

export function useCannonBlastEngine() {
  const [phase,      setPhase]      = useState('idle');   // idle|aiming|flying|landed
  const [angle,      setAngle]      = useState(35);       // cannon angle 0-90
  const [power,      setPower]      = useState(60);       // launch power 10-100
  const [distance,   setDistance]   = useState(0);
  const [ballPos,    setBallPos]    = useState({ x: 120, y: FLOOR_Y - BALL_R });
  const [ballTrail,  setBallTrail]  = useState([]);
  const [activeFX,   setActiveFX]   = useState([]);       // active visual effects
  const [boostQueue, setBoostQueue] = useState([]);
  const [leaderboard,setLeaderboard]= useState([]);
  const [lastViewer, setLastViewer] = useState(null);
  const [cannon,     setCannon]     = useState({ x: 120, y: FLOOR_Y });
  const [overlayTheme, setOverlayTheme] = useState('sky');
