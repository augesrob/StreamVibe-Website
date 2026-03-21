/**
 * CannonGame v12 — Exact Ball Guys Cannon Mode Recreation
 *
 * Architecture: DOM-based React with CSS transforms for camera
 * - Fixed cannon on left edge of viewport
 * - CSS transform translateX() moves the "world" left as ball travels right
 * - Ball position is absolute within the scrolling world
 * - Markers are real DOM elements (large green/pink circles)
 * - Reward boxes are real DOM elements below each marker
 * - Sky + clouds + hot air balloon in upper half
 * - Sandy ground in lower half
 * - Score box top-left, multiplier panel top-left
 *
 * This matches screenshots exactly:
 * - Large numbered green circles (20px radius) on the wooden rail
 * - Pink/purple circle for current landing zone  
 * - Reward boxes (diamond/coin/skin) below each marker
 * - Canon stays LEFT, world scrolls right
 * - Username label above cannonball
 */
import React, { useRef, useEffect, useState } from 'react';
import { CHEST_PICKS } from '@/hooks/useCannonEngine';

// World constants
const WORLD_WIDTH   = 8000;  // total world px width
const MARKER_STEP   = 85;    // px between markers
const BALL_R        = 13;
const CANNON_SCREEN_X = 68;  // cannon fixed at this X on screen
const PLATFORM_FRAC = 0.54;  // platform at 54% of canvas height

// Ball skins from your downloaded images
const BALL_SKINS = [
  '/ballguys_skin_4.png',   // yellow ball with sunglasses
  '/ballguys_skin_5.png',   // tomato
  '/ballguys_skin_6.png',   // spongebob
  '/ballguys_skin_7.png',
  '/ballguys_skin_8.png',
  '/ballguys_skin_9.png',
  '/ballguys_skin_10.png',
  '/ballguys_skin_11.png',
  '/ballguys_skin_12.png',
  '/ballguys_skin_13.png',
];

// Reward data seeded deterministically per marker number
function getReward(markerNum) {
  const rewards = [
    { type:'diamond', icon:'💎', label:'20',   bg:'#9922ee', border:'#7700cc', textCol:'#fff'  },
    { type:'coin',    icon:'$',  label:'$5',   bg:'#f8f8ee', border:'#ccaa00', textCol:'#885500'},
    { type:'coin',    icon:'$',  label:'$10',  bg:'#f8f8ee', border:'#ccaa00', textCol:'#885500'},
    { type:'diamond', icon:'💎', label:'10',   bg:'#9922ee', border:'#7700cc', textCol:'#fff'  },
    { type:'coin',    icon:'$',  label:'$80',  bg:'#f8f8ee', border:'#ccaa00', textCol:'#885500'},
    { type:'coin',    icon:'$',  label:'$120', bg:'#f8f8ee', border:'#ccaa00', textCol:'#885500'},
    { type:'coin',    icon:'$',  label:'$145', bg:'#f8f8ee', border:'#ccaa00', textCol:'#885500'},
    { type:'coin',    icon:'$',  label:'$200', bg:'#f8f8ee', border:'#ccaa00', textCol:'#885500'},
    { type:'skin',    icon:'👕', label:'Common',bg:'#eef0ff', border:'#8899cc', textCol:'#334'},
    { type:'coin',    icon:'$',  label:'$380', bg:'#f8f8ee', border:'#ccaa00', textCol:'#885500'},
  ];
  return rewards[markerNum % rewards.length];
}

// Pre-generate markers
const MARKERS = Array.from({ length: 200 }, (_, i) => ({
  num:    i + 1,
  worldX: (i + 1) * MARKER_STEP,
  reward: getReward(i + 1),
}));

export default function CannonGame({ engine }) {
  const containerRef = useRef(null);
  const [canvasH, setCanvasH] = useState(560);
  const [selectedSkin, setSelectedSkin] = useState(0);

  const {
    phase, ballX, ballY, ballRot, ballUser, camX,
    score, bestScore, rewardLabel, currentMark,
    chargeLevel, multipliers, activeBoost,
    showChestPick, chestsRemain, pickedChests, auctionBids, auctionWinner,
    startNewRound, tapToShoot, endAuction, pickChest, resetRound,
  } = engine;

  // Measure container height
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const h = entries[0].contentRect.height;
      if (h > 200) setCanvasH(h);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const showBall = phase === 'flying' || phase === 'rolling' || phase === 'landed';
  const inGame   = phase !== 'idle' && phase !== 'auction' && phase !== 'chest_pick';

  // Platform sits at 54% of canvas height
  const platY   = Math.round(canvasH * PLATFORM_FRAC);
  const platH   = 22;
  const markerY = platY - 20; // marker circles sit on top of rail

  // Ball position in canvas coords
  // ballX is world units (each unit = MARKER_STEP/10 px)
  const PX_PER_WU = MARKER_STEP / 10;
  const ballWorldPx = ballX * PX_PER_WU;
  const ballScreenX = CANNON_SCREEN_X + (ballWorldPx - camX * PX_PER_WU);
  const ballScreenY = platY - ballY * PX_PER_WU - BALL_R;

  // World scroll: how many px the world has shifted left
  const worldShift = camX * PX_PER_WU;

  // Cloud positions (parallax)
  const cloudOff = worldShift * 0.12;

  // Hot air balloon
  const balloonX = ((280 - worldShift * 0.18 + WORLD_WIDTH) % (WORLD_WIDTH * 0.3)) - 100;
  const balloonY = platY * 0.38 + Math.sin(Date.now() / 1800) * 8;
  const showBalloon = score > 30 || phase === 'flying' || phase === 'rolling';

  if (phase === 'auction' || phase === 'chest_pick') {
    return <ChestPickScreen engine={engine} />;
  }

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      width: '100%',
      minHeight: 520,
      background: '#0a0b14',
      borderRadius: 14,
      overflow: 'hidden',
      border: '2px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Game viewport ── */}
      <div style={{
        position: 'relative',
        flex: 1,
        overflow: 'hidden',
        cursor: phase === 'tap_to_shoot' ? 'pointer' : 'default',
        minHeight: 480,
      }} onClick={tapToShoot}>

        {/* ── SKY ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: platY,
          background: 'linear-gradient(180deg, #72c0e8 0%, #9ed4f0 60%, #bde4f8 100%)',
        }}>
          {/* Clouds */}
          {[
            { x: 90,  y: 55,  s: 1.1 },
            { x: 280, y: 38,  s: 0.85 },
            { x: 430, y: 68,  s: 0.72 },
            { x: 620, y: 44,  s: 0.9  },
          ].map((c, i) => (
            <Cloud key={i}
              x={((c.x - cloudOff * (0.8 + i*0.1) + 2000) % 900) - 100}
              y={c.y} scale={c.s}/>
          ))}

          {/* Hot air balloon */}
          {showBalloon && (
            <HotAirBalloon x={((balloonX % 700) + 700) % 700} y={balloonY}/>
          )}

          {/* "Tap to Shoot!" */}
          {phase === 'tap_to_shoot' && (
            <div style={{
              position: 'absolute',
              top: '50%', left: '55%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                fontFamily: "'Arial Black', Impact, Arial",
                fontSize: 32, fontWeight: 900,
                color: 'white',
                textShadow: '2px 2px 0 rgba(0,0,0,0.6), -1px -1px 0 rgba(0,0,0,0.4)',
                lineHeight: 1.2,
              }}>
                Tap To<br/>Shoot!
              </div>
            </div>
          )}
        </div>

        {/* ── SANDY GROUND ── */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: platY + platH, bottom: 0,
          background: 'linear-gradient(180deg, #d4a858 0%, #c49040 15%, #a87030 100%)',
          overflow: 'hidden',
        }}>
          {/* Ground details */}
          <div style={{ position:'absolute', left:70, top:25, width:18, height:10,
            borderRadius:'50%', background:'rgba(140,90,30,0.5)' }}/>
          <div style={{ position:'absolute', left:200, top:55, width:12, height:8,
            borderRadius:'50%', background:'rgba(140,90,30,0.5)' }}/>
          <div style={{ position:'absolute', left:360, top:38, width:22, height:12,
            borderRadius:'50%', background:'rgba(140,90,30,0.5)' }}/>
          {/* Worm */}
          <svg style={{ position:'absolute', left:140, top:58, width:50, height:25 }}>
            <path d="M 0,15 Q 15,5 30,17 Q 42,25 50,12" stroke="#7a3a10"
              strokeWidth={2.5} fill="none" strokeLinecap="round"/>
          </svg>
          {/* Bone */}
          <svg style={{ position:'absolute', left:290, top:78, width:36, height:18 }}>
            <circle cx={5} cy={9} r={5} fill="#ede0c0"/>
            <rect x={4} y={6} width={28} height={6} fill="#ede0c0"/>
            <circle cx={31} cy={9} r={5} fill="#ede0c0"/>
          </svg>
        </div>

        {/* ── SCROLLING WORLD (markers live here) ── */}
        <div style={{
          position: 'absolute',
          left: CANNON_SCREEN_X,
          top: 0, bottom: 0,
          width: WORLD_WIDTH,
          transform: `translateX(${-worldShift}px)`,
          willChange: 'transform',
        }}>
          {/* Markers — only render visible ones */}
          {MARKERS.filter(m => {
            const screenX = m.worldX - worldShift + CANNON_SCREEN_X;
            return screenX > -60 && screenX < 1000;
          }).map(mk => {
            const isCurrent = mk.num === currentMark;
            return (
              <React.Fragment key={mk.num}>
                {/* Circle sits ON the rail */}
                <div style={{
                  position: 'absolute',
                  left: mk.worldX - 20,
                  top: markerY - 20,
                  width: 40, height: 40,
                  borderRadius: '50%',
                  background: isCurrent
                    ? 'radial-gradient(circle at 35% 35%, #ff99dd, #cc3388 50%, #882255)'
                    : 'radial-gradient(circle at 35% 35%, #88ee66, #44aa22 50%, #227700)',
                  border: `2.5px solid ${isCurrent ? '#ff44aa' : '#33aa00'}`,
                  boxShadow: `0 3px 8px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 3,
                }}>
                  <span style={{
                    fontFamily: "'Arial Black', Arial",
                    fontSize: mk.num > 99 ? 9 : mk.num > 9 ? 11 : 13,
                    fontWeight: 900,
                    color: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    lineHeight: 1,
                  }}>{mk.num}</span>
                </div>

                {/* Reward box below platform */}
                <div style={{
                  position: 'absolute',
                  left: mk.worldX - 18,
                  top: platY + platH + 6,
                  width: 36, height: 30,
                  borderRadius: 5,
                  background: mk.reward.bg,
                  border: `2px solid ${mk.reward.border}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  zIndex: 2,
                }}>
                  <span style={{ fontSize: 12, lineHeight: 1 }}>{mk.reward.icon}</span>
                  <span style={{
                    fontSize: 7, fontWeight: 700,
                    color: mk.reward.textCol, lineHeight: 1.2,
                  }}>{mk.reward.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* ── PLATFORM RAIL (fixed in viewport, scrolling world below) ── */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          top: platY, height: platH,
          background: 'linear-gradient(180deg, #cc8030 0%, #a06018 40%, #7a4208 100%)',
          zIndex: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {/* Top shine */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
            background:'rgba(255,200,100,0.3)' }}/>
          {/* Wood grain lines */}
          {[5, 10, 16].map(dy => (
            <div key={dy} style={{ position:'absolute', top:dy, left:0, right:0,
              height:1, background:'rgba(0,0,0,0.1)' }}/>
          ))}
          {/* Nails */}
          {Array.from({ length: 18 }, (_, i) => (
            <div key={i} style={{
              position:'absolute',
              left: 25 + i*55, top: '50%',
              width:6, height:6, borderRadius:'50%',
              transform:'translateY(-50%)',
              background:'#5a2808',
            }}/>
          ))}
        </div>

        {/* ── CANNON (fixed position, does NOT scroll) ── */}
        <CannonSVG x={CANNON_SCREEN_X} y={platY} chargeLevel={chargeLevel} phase={phase} ballX={ballX} />

        {/* ── BALL ── */}
        {showBall && (
          <div style={{
            position: 'absolute',
            left: ballScreenX,
            top: ballScreenY,
            zIndex: 10,
            transform: `rotate(${ballRot}deg)`,
            transition: 'transform 0ms',
            willChange: 'left, top, transform',
          }}>
            {/* Use skin image or fallback to CSS ball */}
            <div style={{
              width: BALL_R*2, height: BALL_R*2,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #888, #2a2a2a 50%, #0d0d0d)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.6), inset 0 -2px 4px rgba(0,0,0,0.4)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Shine */}
              <div style={{
                position:'absolute', top:3, left:3, width:8, height:5,
                borderRadius:'50%', background:'rgba(255,255,255,0.25)',
                transform:'rotate(-20deg)',
              }}/>
            </div>
            {/* Username label */}
            {ballUser && (
              <div style={{
                position: 'absolute',
                bottom: BALL_R*2 + 4,
                left: '50%',
                transform: `translateX(-50%) rotate(${-ballRot}deg)`,
                background: 'rgba(0,0,0,0.75)',
                color: 'white',
                fontSize: 11,
                fontWeight: 900,
                fontFamily: 'Arial, sans-serif',
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>@{ballUser.slice(0, 14)}</div>
            )}
          </div>
        )}

        {/* ── CHARGE BAR ── */}
        {phase === 'tap_to_shoot' && chargeLevel > 0 && (
          <div style={{
            position: 'absolute', left: 50, right: 50, top: 14,
            zIndex: 20,
          }}>
            <div style={{
              background:'rgba(0,0,0,0.72)', borderRadius:10,
              padding:'3px', border:'1px solid rgba(255,255,255,0.15)',
            }}>
              <div style={{
                height:22, borderRadius:8,
                width: `${chargeLevel}%`,
                background: chargeLevel < 40 ? '#00ddff' : chargeLevel < 70 ? '#ffd600' : chargeLevel < 90 ? '#ff7700' : '#ff1122',
                transition: 'width 0.1s',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <span style={{ color:'white', fontWeight:900, fontSize:11, whiteSpace:'nowrap' }}>
                  {chargeLevel < 25 ? '🎁 Gift to charge!' : `⚡ ${Math.round(chargeLevel)}%`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── SCORE BOX (top-left, wooden frame) ── */}
        {inGame && (
          <div style={{
            position:'absolute', top:6, left:6, zIndex:15,
            background:'rgba(240,215,150,0.96)',
            border:'2.5px solid #8b5510',
            borderRadius:7, padding:'5px 10px',
            boxShadow:'1px 2px 6px rgba(0,0,0,0.35)',
            minWidth:115,
          }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#222', display:'flex', gap:4, alignItems:'center' }}>
              <span>Score:</span>
              <span style={{ color: score>100?'#22aa22':score>50?'#aa9900':'#cc5500', fontWeight:900 }}>{score}</span>
              <span style={{ color:'#cc7700' }}>→</span>
            </div>
            <div style={{ fontSize:12, color:'#222', display:'flex', gap:4 }}>
              <span>Rewards:</span>
              <span style={{ fontWeight:700, color:rewardLabel==='Good'?'#228822':rewardLabel==='Fair'?'#888822':'#cc5500' }}>
                {rewardLabel||'Poor'}
              </span>
            </div>
          </div>
        )}

        {/* ── MULTIPLIER PANEL ── */}
        {inGame && (
          <div style={{
            position:'absolute', top:62, left:6, zIndex:15,
            background:'rgba(240,215,150,0.96)',
            border:'2px solid #8b5510',
            borderRadius:6, padding:'5px 8px',
            boxShadow:'1px 2px 5px rgba(0,0,0,0.3)',
          }}>
            {[['🔫', multipliers.launch, '#ff4400'],
              ['💣', multipliers.bombs,  '#44aa00'],
              ['⭐', multipliers.power,  '#ff8800']].map(([icon,val,col],i)=>(
              <div key={i} style={{ display:'flex', gap:6, alignItems:'center', marginBottom:i<2?3:0 }}>
                <span style={{ fontSize:13 }}>{icon}</span>
                <span style={{ fontWeight:900, fontSize:13, color:col }}>{val}x</span>
              </div>
            ))}
          </div>
        )}

        {/* ── BALL GUYS LOGO ── */}
        {inGame && (
          <div style={{
            position:'absolute', top:124, left:8, zIndex:14,
            fontFamily:"'Arial Black',Impact,Arial",
            fontSize:22, fontWeight:900,
            color:'rgba(20,20,40,0.8)',
            textShadow:'1px 1px 3px rgba(0,0,0,0.4)',
            lineHeight:1.15,
            userSelect:'none',
          }}>
            BALL<br/>GUYS
          </div>
        )}

        {/* ── BOOST BANNER ── */}
        {activeBoost && (
          <div style={{
            position:'absolute', bottom:8, left:'50%',
            transform:'translateX(-50%)',
            background:activeBoost.color||'#ff6600',
            color:'black', fontWeight:900, fontSize:13,
            fontFamily:"'Arial Black',Arial",
            padding:'7px 20px', borderRadius:10,
            boxShadow:`0 3px 12px ${activeBoost.color}99`,
            whiteSpace:'nowrap', zIndex:20,
          }}>
            {activeBoost.emoji} {activeBoost.label}
          </div>
        )}

        {/* ── LANDING RESULT ── */}
        {phase === 'landed' && (
          <div style={{
            position:'absolute', top:'50%', left:'50%',
            transform:'translate(-50%,-50%)',
            background:'rgba(0,0,0,0.78)',
            border:'3px solid #ffd700',
            borderRadius:16, padding:'18px 32px',
            textAlign:'center', zIndex:25,
          }}>
            <div style={{ color:'#ffd700', fontSize:16, fontWeight:900, fontFamily:"'Arial Black',Arial" }}>
              🏁 LANDED!
            </div>
            <div style={{ color:'white', fontSize:36, fontWeight:900, fontFamily:'monospace' }}>
              {score}
            </div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}>
              Best: {bestScore}
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM CONTROLS ── */}
      <div style={{
        display:'flex', gap:8, padding:'8px 12px',
        background:'rgba(0,0,0,0.6)',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        flexWrap:'wrap', justifyContent:'center',
        flexShrink:0,
      }}>
        {(phase==='idle'||phase==='landed') && (
          <button onClick={startNewRound} style={{
            background:'#228844', color:'#fff', fontWeight:900,
            border:'none', borderRadius:8, padding:'7px 20px',
            cursor:'pointer', fontSize:13,
          }}>🚀 New Round</button>
        )}
        {phase==='tap_to_shoot' && (
          <button onClick={tapToShoot} style={{
            background:'#ff6600', color:'#fff', fontWeight:900,
            border:'none', borderRadius:8, padding:'7px 20px',
            cursor:'pointer', fontSize:14,
          }}>💥 SHOOT!</button>
        )}
        {phase!=='idle'&&phase!=='auction'&&phase!=='chest_pick'&&phase!=='landed' && (
          <button onClick={resetRound} style={{
            background:'rgba(60,60,80,0.6)', color:'#aaa',
            border:'1px solid #444', borderRadius:8,
            padding:'6px 14px', cursor:'pointer', fontSize:12,
          }}>↺ Reset</button>
        )}
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11, alignSelf:'center' }}>
          Best: <b style={{color:'#ffd700'}}>{bestScore||'—'}</b>
        </span>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function Cloud({ x, y, scale = 1 }) {
  const s = scale;
  return (
    <div style={{ position:'absolute', left:x, top:y, pointerEvents:'none' }}>
      <svg width={120*s} height={55*s} viewBox="0 0 120 55">
        <ellipse cx={55} cy={38} rx={45} ry={26} fill="rgba(255,255,255,0.94)"/>
        <ellipse cx={40} cy={28} rx={32} ry={24} fill="rgba(255,255,255,0.94)"/>
        <ellipse cx={75} cy={24} rx={28} ry={22} fill="rgba(255,255,255,0.94)"/>
        <ellipse cx={92} cy={34} rx={24} ry={20} fill="rgba(255,255,255,0.94)"/>
        <ellipse cx={20} cy={36} rx={22} ry={18} fill="rgba(255,255,255,0.94)"/>
      </svg>
    </div>
  );
}

function HotAirBalloon({ x, y }) {
  return (
    <div style={{ position:'absolute', left:x, top:y, pointerEvents:'none' }}>
      <svg width={68} height={90} viewBox="0 0 68 90">
        {/* Envelope */}
        <ellipse cx={34} cy={30} rx={26} ry={32}
          fill="url(#balloonGrad)" stroke="rgba(0,0,0,0.1)" strokeWidth={1}/>
        {/* Stripes */}
        {[-12, 0, 12].map((sx, i) => (
          <line key={i} x1={34+sx} y1={0} x2={34+sx} y2={60}
            stroke="rgba(255,255,255,0.3)" strokeWidth={2}/>
        ))}
        {/* Basket */}
        <rect x={26} y={63} width={16} height={13} rx={2}
          fill="#8b6914" stroke="#5a4510" strokeWidth={1.5}/>
        {/* Ropes */}
        <line x1={26} y1={62} x2={22} y2={58} stroke="#8b6914" strokeWidth={1.2}/>
        <line x1={42} y1={62} x2={46} y2={58} stroke="#8b6914" strokeWidth={1.2}/>
        <defs>
          <radialGradient id="balloonGrad" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#a8cc44"/>
            <stop offset="50%" stopColor="#7aaa22"/>
            <stop offset="100%" stopColor="#558800"/>
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

function CannonSVG({ x, y, chargeLevel, phase, ballX }) {
  const barrelAngle = -(35 + (chargeLevel / 100) * 6);
  const showSmoke = phase === 'flying' && ballX < 1.5;
  return (
    <svg
      style={{ position:'absolute', left: x - 40, top: y - 28, zIndex:5, pointerEvents:'none' }}
      width={120} height={70} viewBox="0 0 120 70">
      {/* Wheels */}
      {[[22, 48], [55, 48]].map(([wx, wy], i) => (
        <g key={i}>
          <circle cx={wx} cy={wy} r={14} fill="url(#wheelGrad)" stroke="#222" strokeWidth={2.5}/>
          <circle cx={wx} cy={wy} r={5} fill="#1a1a1a"/>
          {[0,60,120,180,240,300].map(a => (
            <line key={a}
              x1={wx + Math.cos(a*Math.PI/180)*5} y1={wy + Math.sin(a*Math.PI/180)*5}
              x2={wx + Math.cos(a*Math.PI/180)*12} y2={wy + Math.sin(a*Math.PI/180)*12}
              stroke="#2a2a2a" strokeWidth={1.5}/>
          ))}
        </g>
      ))}
      {/* Carriage */}
      <rect x={14} y={28} width={50} height={20} rx={6} fill="#1a1208" stroke="#333" strokeWidth={2}/>
      {/* Barrel */}
      <g transform={`rotate(${barrelAngle}, 38, 34)`}>
        {/* Barrel shadow */}
        <rect x={30} y={28} width={62} height={17} rx={8} fill="rgba(0,0,0,0.25)" transform="translate(2,2)"/>
        {/* Barrel body */}
        <rect x={30} y={26} width={62} height={17} rx={8} fill="url(#barrelGrad)" stroke="#444" strokeWidth={1.5}/>
        {/* Muzzle ring */}
        <circle cx={93} cy={34} r={9} fill="#555" stroke="#333" strokeWidth={1.5}/>
      </g>
      {/* Fuse */}
      <path d="M 40 26 Q 48 16 46 10" stroke="#888" strokeWidth={1.5} fill="none"/>
      <circle cx={46} cy={9} r={4} fill="#ff5500"/>
      {/* Smoke */}
      {showSmoke && (
        <>
          <circle cx={98} cy={34} r={12} fill="rgba(220,220,220,0.7)"/>
          <circle cx={110} cy={28} r={9} fill="rgba(220,220,220,0.6)"/>
          <circle cx={116} cy={36} r={7} fill="rgba(220,220,220,0.5)"/>
        </>
      )}
      <defs>
        <radialGradient id="wheelGrad" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#555"/>
          <stop offset="100%" stopColor="#111"/>
        </radialGradient>
        <linearGradient id="barrelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#444"/>
          <stop offset="40%" stopColor="#111"/>
          <stop offset="100%" stopColor="#333"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Chest Pick Screen ─────────────────────────────────────────────────
// Exactly matches Screenshot 1: notebook bg, cannon, wooden sign, 3×3 grid
function ChestPickScreen({ engine }) {
  const {
    phase, auctionBids, auctionWinner,
    chestsRemain, pickedChests, endAuction, pickChest,
  } = engine;

  const picked = pickedChests || [];

  if (phase === 'auction') return (
    <div style={{
      background:'#f5f0e4',
      backgroundImage:'linear-gradient(rgba(150,150,200,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(150,150,200,0.15) 1px,transparent 1px)',
      backgroundSize:'22px 22px',
      minHeight:520, width:'100%', display:'flex', flexDirection:'column',
      alignItems:'center', padding:'18px 14px', boxSizing:'border-box',
    }}>
      <div style={{ fontSize:48, marginBottom:8 }}>💥</div>
      <div style={{ fontSize:15, fontWeight:900, color:'#333', marginBottom:16, textAlign:'center',
        fontFamily:"'Arial Black',Arial" }}>
        🏆 AUCTION — Highest gifter picks chests!
      </div>
      {Object.entries(auctionBids).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([u,c],i)=>(
        <div key={u} style={{ display:'flex', gap:8, background:'rgba(255,215,0,0.15)',
          border:'1.5px solid rgba(200,150,0,0.4)', borderRadius:9, padding:'7px 14px',
          marginBottom:7, width:'92%', maxWidth:320 }}>
          <span style={{ fontSize:16 }}>{['🥇','🥈','🥉','4.','5.'][i]}</span>
          <span style={{ flex:1, fontWeight:700, fontSize:13 }}>@{u}</span>
          <span style={{ color:'#cc8800', fontWeight:900 }}>{c.toLocaleString()} 💎</span>
        </div>
      ))}
      {Object.keys(auctionBids).length === 0 && (
        <p style={{ color:'#888', fontSize:13 }}>Waiting for gifts...</p>
      )}
      <button onClick={endAuction} style={{
        marginTop:16, background:'linear-gradient(180deg,#ffd700,#cc9900)',
        color:'#000', fontWeight:900, border:'2px solid #8b6600',
        borderRadius:12, padding:'11px 28px', cursor:'pointer', fontSize:14,
        boxShadow:'0 3px 8px rgba(0,0,0,0.3)',
      }}>End Auction → Pick Chests</button>
      <button onClick={endAuction} style={{
        marginTop:8, background:'transparent', color:'#999', border:'none',
        cursor:'pointer', fontSize:12,
      }}>Skip (no auction)</button>
    </div>
  );

  // Chest pick — 3×3 grid of 9 chests
  return (
    <div style={{
      background:'#f5f0e4',
      backgroundImage:'linear-gradient(rgba(150,150,200,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(150,150,200,0.15) 1px,transparent 1px)',
      backgroundSize:'22px 22px',
      width:'100%', minHeight:520, display:'flex', flexDirection:'column',
      alignItems:'center', padding:'10px 14px 16px', boxSizing:'border-box',
    }}>
      {/* Cannon icon */}
      <div style={{ fontSize:38, marginBottom:2, filter:'drop-shadow(0 3px 4px rgba(0,0,0,0.3))' }}>💥</div>

      {/* Wooden sign */}
      <div style={{
        background:'linear-gradient(180deg,#d49a40,#a06820 60%,#8b5510)',
        border:'3px solid #5a2808', borderRadius:8, padding:'10px 20px',
        marginBottom:12, boxShadow:'2px 4px 10px rgba(0,0,0,0.4)',
        width:'88%', maxWidth:260, position:'relative',
      }}>
        {CHEST_PICKS.map((c, i) => (
          <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8,
            marginBottom: i < CHEST_PICKS.length-1 ? 6 : 0 }}>
            <span style={{ fontSize:18 }}>{c.icon}</span>
            <span style={{ flex:1, color:'#fff', fontWeight:700, fontSize:14,
              textShadow:'0 1px 3px rgba(0,0,0,0.6)' }}>{c.label}</span>
            <span style={{ fontWeight:900, fontSize:16,
              color: i===0?'#ff8800':i===1?'#66ff00':'#ffdd00',
              textShadow:'0 1px 4px rgba(0,0,0,0.7)' }}>
              X {c.mult}x
            </span>
          </div>
        ))}
      </div>

      {/* PICK N CHESTS label */}
      <div style={{
        fontWeight:900, fontSize:17, color:'#444', letterSpacing:2,
        marginBottom:14, fontFamily:"'Arial Black',Impact,Arial",
        textTransform:'uppercase',
      }}>
        PICK {chestsRemain} CHEST{chestsRemain!==1?'S':''}
      </div>

      {/* 3×3 grid = 9 chests */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,82px)', gap:10 }}>
        {Array.from({ length: 9 }, (_, i) => {
          const isPicked = i < picked.length;
          const chestType = CHEST_PICKS[i % CHEST_PICKS.length];
          const pickedType = isPicked ? CHEST_PICKS.find(c=>c.id===picked[i])||chestType : null;
          const disabled = chestsRemain <= 0 && !isPicked;

          return (
            <div key={i}
              onClick={() => !isPicked && chestsRemain > 0 && pickChest(chestType.id)}
              style={{
                width:82, height:72,
                cursor: isPicked||chestsRemain<=0 ? 'default' : 'pointer',
                display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                background: isPicked
                  ? 'linear-gradient(180deg,#b8b8b0,#888880)'
                  : 'linear-gradient(180deg,#d4883a 0%,#b06020 40%,#8b4210 100%)',
                border: `2.5px solid ${isPicked ? '#777' : '#5a2808'}`,
                borderRadius:10,
                boxShadow: isPicked
                  ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                  : '2px 4px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,200,100,0.3)',
                opacity: disabled ? 0.45 : 1,
                transition:'transform 0.1s',
              }}
              onMouseEnter={e=>{ if(!isPicked&&chestsRemain>0) e.currentTarget.style.transform='scale(1.06)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)'; }}>

              {isPicked ? (
                <>
                  <span style={{ fontSize:24 }}>{pickedType?.icon||'✅'}</span>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.7)', marginTop:2 }}>
                    {pickedType?.label}
                  </span>
                </>
              ) : (
                /* Chest graphic */
                <div style={{ width:44, height:38, position:'relative' }}>
                  {/* Lid */}
                  <div style={{
                    position:'absolute', top:0, left:0, right:0, height:16,
                    background:'linear-gradient(180deg,#c87030,#a05018)',
                    borderRadius:'5px 5px 0 0',
                    border:'1.5px solid #5a2808', borderBottom:'none',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <div style={{ width:10,height:7,background:'#ffd700',
                      borderRadius:2,border:'1px solid #cc9900' }}/>
                  </div>
                  {/* Body */}
                  <div style={{
                    position:'absolute', bottom:0, left:0, right:0, height:23,
                    background:'linear-gradient(180deg,#a06020,#7a4010)',
                    borderRadius:'0 0 5px 5px',
                    border:'1.5px solid #5a2808', borderTop:'1px solid #8b5020',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <div style={{ width:13,height:11,background:'#e8c000',
                      borderRadius:'2px 2px 3px 3px',border:'1px solid #cc9900'}}/>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {chestsRemain <= 0 && (
        <div style={{ marginTop:14, color:'#228822', fontWeight:900, fontSize:14 }}>
          ✅ Ready to fire!
        </div>
      )}
    </div>
  );
}
