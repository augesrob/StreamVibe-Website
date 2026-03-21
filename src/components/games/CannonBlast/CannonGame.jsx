/**
 * CannonGame v13
 * Fixes:
 * 1. Markers sit ON TOP of rail (center at rail-top, so bottom half is IN rail = looks like bump)
 * 2. Bombs (💣) and bouncers (🟡) shown as DOM elements on the platform
 * 3. Chest grid: 9 mystery chests, clicking ANY reveals a random reward
 */
import React, { useRef, useEffect, useState } from 'react';
import { CHEST_PICKS, CHEST_REWARDS, MARKERS } from '@/hooks/useCannonEngine';

const BALL_R          = 13;
const CANNON_SCREEN_X = 68;
const PLATFORM_FRAC   = 0.54;
const PX_PER_WU       = 8.5;   // pixels per world unit (MARKER_SPACING_WU=10 → 85px)
const MARKER_R        = 20;     // radius of marker circles

export default function CannonGame({ engine }) {
  const containerRef = useRef(null);
  const [viewH, setViewH] = useState(520);

  const {
    phase, ballX, ballY, ballRot, ballUser, camX,
    score, bestScore, rewardLabel, currentMark, platObjects,
    chargeLevel, multipliers, activeBoost,
    chestsRemain, pickedChests, auctionBids, auctionWinner,
    startNewRound, tapToShoot, endAuction, pickChest, resetRound,
  } = engine;

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(e => {
      const h = e[0].contentRect.height;
      if (h > 200) setViewH(h);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const showBall = phase==='flying'||phase==='rolling'||phase==='landed';
  const inGame   = phase!=='idle'&&phase!=='auction'&&phase!=='chest_pick';

  const platY      = Math.round(viewH * PLATFORM_FRAC);
  const platH      = 22;
  const worldShift = camX * PX_PER_WU;

  // Ball screen position
  const ballSX = CANNON_SCREEN_X + (ballX * PX_PER_WU - worldShift);
  const ballSY = platY - ballY * PX_PER_WU - BALL_R;

  // Parallax cloud offset
  const cloudOff = worldShift * 0.12;

  if (phase==='auction'||phase==='chest_pick') return <ChestPickScreen engine={engine}/>;

  return (
    <div ref={containerRef} style={{
      position:'relative', width:'100%', minHeight:500,
      background:'#0a0b14', borderRadius:14, overflow:'hidden',
      border:'2px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column',
    }}>
      {/* ── GAME AREA ── */}
      <div style={{
        position:'relative', flex:1, overflow:'hidden', minHeight:460,
        cursor: phase==='tap_to_shoot'?'pointer':'default',
      }} onClick={tapToShoot}>

        {/* SKY */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:platY,
          background:'linear-gradient(180deg,#72c0e8 0%,#9ed4f0 60%,#bde4f8 100%)',
        }}>
          {/* Clouds */}
          {[{x:90,y:55,s:1.1},{x:300,y:38,s:0.85},{x:500,y:65,s:0.72}].map((c,i)=>(
            <Cloud key={i}
              x={((c.x-cloudOff*(0.8+i*0.12)+2000)%900)-100}
              y={c.y} scale={c.s}/>
          ))}
          {/* Hot air balloon */}
          {(score>25||phase==='flying'||phase==='rolling') && (
            <HotAirBalloon
              x={((280-worldShift*0.15+8000)%800)-80}
              y={platY*0.35+Math.sin(Date.now()/1800)*7}/>
          )}
          {/* Tap To Shoot */}
          {phase==='tap_to_shoot' && (
            <div style={{
              position:'absolute', top:'50%', left:'55%',
              transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none',
            }}>
              <div style={{
                fontFamily:"'Arial Black',Impact,Arial", fontSize:34, fontWeight:900,
                color:'white', lineHeight:1.2,
                textShadow:'2px 2px 0 rgba(0,0,0,0.65),-1px -1px 0 rgba(0,0,0,0.3)',
              }}>Tap To<br/>Shoot!</div>
            </div>
          )}
        </div>

        {/* SANDY GROUND */}
        <div style={{
          position:'absolute', left:0, right:0,
          top:platY+platH, bottom:0,
          background:'linear-gradient(180deg,#d4a858 0%,#c49040 15%,#a87030 100%)',
          overflow:'hidden',
        }}>
          <div style={{position:'absolute',left:70,top:25,width:18,height:10,borderRadius:'50%',background:'rgba(140,90,30,0.5)'}}/>
          <div style={{position:'absolute',left:220,top:52,width:14,height:9,borderRadius:'50%',background:'rgba(140,90,30,0.5)'}}/>
          <div style={{position:'absolute',left:380,top:35,width:20,height:11,borderRadius:'50%',background:'rgba(140,90,30,0.5)'}}/>
          <svg style={{position:'absolute',left:145,top:55,width:50,height:22}}>
            <path d="M 0,14 Q 14,5 28,16 Q 40,24 50,11" stroke="#7a3a10" strokeWidth={2.5} fill="none" strokeLinecap="round"/>
          </svg>
          <svg style={{position:'absolute',left:290,top:72,width:36,height:18}}>
            <circle cx={5} cy={9} r={5} fill="#ede0c0"/>
            <rect x={4} y={6} width={28} height={6} fill="#ede0c0"/>
            <circle cx={31} cy={9} r={5} fill="#ede0c0"/>
          </svg>
        </div>

        {/* SCROLLING WORLD */}
        <div style={{
          position:'absolute', left:CANNON_SCREEN_X, top:0, bottom:0, width:12000,
          transform:`translateX(${-worldShift}px)`, willChange:'transform',
        }}>
          {/* Markers — sit ON TOP of rail: center is at (platY - MARKER_R) so bottom edge = platY */}
          {MARKERS.filter(m=>{
            const sx = m.worldX*PX_PER_WU - worldShift + CANNON_SCREEN_X;
            return sx > -50 && sx < 1200;
          }).map(mk=>{
            const isCurrent = mk.num === currentMark;
            const worldPx = mk.wx * PX_PER_WU;
            return (
              <React.Fragment key={mk.num}>
                {/* Marker circle — top edge above rail, bottom edge AT rail top */}
                <div style={{
                  position:'absolute',
                  left: worldPx - MARKER_R,
                  top: platY - MARKER_R*2,  // ← sits ON TOP of rail, not half-buried
                  width: MARKER_R*2, height: MARKER_R*2,
                  borderRadius:'50%',
                  background: isCurrent
                    ? 'radial-gradient(circle at 35% 35%,#ff99dd,#cc3388 55%,#882255)'
                    : 'radial-gradient(circle at 35% 35%,#88ee66,#44aa22 55%,#1a7700)',
                  border:`2.5px solid ${isCurrent?'#ff44aa':'#229900'}`,
                  boxShadow:`0 3px 8px rgba(0,0,0,0.45),inset 0 -2px 4px rgba(0,0,0,0.2)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  zIndex:6,
                }}>
                  <span style={{
                    fontFamily:"'Arial Black',Arial", fontWeight:900,
                    fontSize: mk.num>99?9:mk.num>9?11:13,
                    color:'white', textShadow:'0 1px 3px rgba(0,0,0,0.65)', lineHeight:1,
                  }}>{mk.num}</span>
                </div>

                {/* Reward box below platform */}
                <div style={{
                  position:'absolute',
                  left: worldPx-18, top: platY+platH+5,
                  width:36, height:30, borderRadius:5,
                  background: mk.reward.bg, border:`2px solid ${mk.reward.border}`,
                  display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', zIndex:2,
                }}>
                  <span style={{fontSize:12,lineHeight:1}}>{mk.reward.icon}</span>
                  <span style={{fontSize:7,fontWeight:700,color:mk.reward.textCol,lineHeight:1.3}}>{mk.reward.label}</span>
                </div>
              </React.Fragment>
            );
          })}

          {/* BOMBS on platform */}
          {(platObjects||[]).filter(o=>o.type==='bomb'&&o.active).map(o=>{
            const worldPx = o.wx * PX_PER_WU;
            return (
              <div key={o.id} style={{
                position:'absolute', left:worldPx-14, top:platY-28,
                width:28, height:28, zIndex:7,
                display:'flex', alignItems:'center', justifyContent:'center',
                filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}>
                <svg width={28} height={28} viewBox="0 0 28 28">
                  <circle cx={14} cy={17} r={11} fill="#111" stroke="#444" strokeWidth={2}/>
                  <path d="M 14 6 Q 18 0 22 2" stroke="#888" strokeWidth={2} fill="none"/>
                  <circle cx={22} cy={2} r={3} fill="#ff5500"/>
                  {/* Shine */}
                  <ellipse cx={10} cy={13} rx={3} ry={2} fill="rgba(255,255,255,0.15)" transform="rotate(-20,10,13)"/>
                </svg>
              </div>
            );
          })}

          {/* BOUNCERS (springs) on platform */}
          {(platObjects||[]).filter(o=>o.type==='bouncer'&&o.active).map(o=>{
            const worldPx = o.wx * PX_PER_WU;
            return (
              <div key={o.id} style={{
                position:'absolute', left:worldPx-16, top:platY-18,
                width:32, height:18, zIndex:7,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <svg width={32} height={18} viewBox="0 0 32 18">
                  <ellipse cx={16} cy={10} rx={14} ry={8}
                    fill="#ffd700" stroke="#cc9900" strokeWidth={2}/>
                  {/* Spring coils */}
                  {[5,11,17,23].map(x=>(
                    <rect key={x} x={x} y={6} width={4} height={8} rx={1}
                      fill="#ffaa00" stroke="#cc7700" strokeWidth={1}/>
                  ))}
                </svg>
              </div>
            );
          })}
        </div>

        {/* PLATFORM RAIL (fixed, doesn't scroll) */}
        <div style={{
          position:'absolute', left:0, right:0, top:platY, height:platH,
          background:'linear-gradient(180deg,#cc8030 0%,#a06018 40%,#7a4208 100%)',
          zIndex:4, boxShadow:'0 2px 8px rgba(0,0,0,0.4)',
        }}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'rgba(255,200,100,0.3)'}}/>
          {[5,10,16].map(dy=>(
            <div key={dy} style={{position:'absolute',top:dy,left:0,right:0,height:1,background:'rgba(0,0,0,0.1)'}}/>
          ))}
          {Array.from({length:18},(_,i)=>(
            <div key={i} style={{
              position:'absolute', left:25+i*55, top:'50%',
              width:6, height:6, borderRadius:'50%',
              transform:'translateY(-50%)', background:'#5a2808',
            }}/>
          ))}
        </div>

        {/* CANNON */}
        <CannonSVG x={CANNON_SCREEN_X} y={platY} chargeLevel={chargeLevel} phase={phase} ballX={ballX}/>

        {/* BALL */}
        {showBall && (
          <div style={{
            position:'absolute', left:ballSX-BALL_R, top:ballSY-BALL_R,
            width:BALL_R*2, height:BALL_R*2, zIndex:10,
            transform:`rotate(${ballRot}deg)`, willChange:'left,top,transform',
          }}>
            <div style={{
              width:'100%', height:'100%', borderRadius:'50%',
              background:'radial-gradient(circle at 35% 30%,#888,#2a2a2a 50%,#0d0d0d)',
              boxShadow:'0 2px 8px rgba(0,0,0,0.65)',
              position:'relative', overflow:'hidden',
            }}>
              <div style={{position:'absolute',top:3,left:3,width:8,height:5,
                borderRadius:'50%',background:'rgba(255,255,255,0.22)',transform:'rotate(-20deg)'}}/>
            </div>
            {ballUser && (
              <div style={{
                position:'absolute', bottom:BALL_R*2+4, left:'50%',
                transform:`translateX(-50%) rotate(${-ballRot}deg)`,
                background:'rgba(0,0,0,0.78)', color:'white',
                fontSize:11, fontWeight:900, padding:'2px 6px',
                borderRadius:4, whiteSpace:'nowrap',
                border:'1px solid rgba(255,255,255,0.2)',
              }}>@{ballUser.slice(0,14)}</div>
            )}
          </div>
        )}

        {/* CHARGE BAR */}
        {phase==='tap_to_shoot' && chargeLevel>0 && (
          <div style={{position:'absolute',left:50,right:50,top:14,zIndex:20}}>
            <div style={{background:'rgba(0,0,0,0.72)',borderRadius:10,padding:'3px',border:'1px solid rgba(255,255,255,0.15)'}}>
              <div style={{
                height:22, borderRadius:8,
                width:`${chargeLevel}%`,
                background:chargeLevel<40?'#00ddff':chargeLevel<70?'#ffd600':chargeLevel<90?'#ff7700':'#ff1122',
                transition:'width 0.1s',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <span style={{color:'white',fontWeight:900,fontSize:11,whiteSpace:'nowrap'}}>
                  {chargeLevel<25?'🎁 Gift to charge!':`⚡ ${Math.round(chargeLevel)}%`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SCORE BOX */}
        {inGame && (
          <div style={{
            position:'absolute', top:6, left:6, zIndex:15,
            background:'rgba(240,215,150,0.96)', border:'2.5px solid #8b5510',
            borderRadius:7, padding:'5px 10px', boxShadow:'1px 2px 6px rgba(0,0,0,0.35)',
          }}>
            <div style={{fontSize:13,fontWeight:700,color:'#222',display:'flex',gap:4,alignItems:'center'}}>
              <span>Score:</span>
              <span style={{color:score>100?'#22aa22':score>50?'#aa9900':'#cc5500',fontWeight:900}}>{score}</span>
              <span style={{color:'#cc7700'}}>→</span>
            </div>
            <div style={{fontSize:12,color:'#222',display:'flex',gap:4}}>
              <span>Rewards:</span>
              <span style={{fontWeight:700,color:rewardLabel==='Good'?'#228822':rewardLabel==='Fair'?'#888822':'#cc5500'}}>{rewardLabel}</span>
            </div>
          </div>
        )}

        {/* MULTIPLIER PANEL */}
        {inGame && (
          <div style={{
            position:'absolute', top:62, left:6, zIndex:15,
            background:'rgba(240,215,150,0.96)', border:'2px solid #8b5510',
            borderRadius:6, padding:'5px 8px', boxShadow:'1px 2px 5px rgba(0,0,0,0.3)',
          }}>
            {[['🔫',multipliers.launch||1,'#ff4400'],
              ['💣',multipliers.bombs||0,'#ff6600'],
              ['🟡',multipliers.bounce||0,'#ffaa00'],
              ['⭐',multipliers.power||1,'#ffdd00']].map(([icon,val,col],i)=>(
              <div key={i} style={{display:'flex',gap:5,alignItems:'center',marginBottom:i<3?2:0}}>
                <span style={{fontSize:12}}>{icon}</span>
                <span style={{fontWeight:900,fontSize:12,color:col}}>{val}x</span>
              </div>
            ))}
          </div>
        )}

        {/* BALL GUYS LOGO */}
        {inGame && (
          <div style={{
            position:'absolute', top:138, left:8, zIndex:14,
            fontFamily:"'Arial Black',Impact,Arial", fontSize:20, fontWeight:900,
            color:'rgba(20,20,40,0.78)', textShadow:'1px 1px 3px rgba(0,0,0,0.4)',
            lineHeight:1.15, userSelect:'none',
          }}>BALL<br/>GUYS</div>
        )}

        {/* BOOST BANNER */}
        {activeBoost && (
          <div style={{
            position:'absolute', bottom:8, left:'50%',
            transform:'translateX(-50%)',
            background:activeBoost.color||'#ff6600', color:'black',
            fontWeight:900, fontSize:14, fontFamily:"'Arial Black',Arial",
            padding:'7px 20px', borderRadius:10,
            boxShadow:`0 3px 12px ${activeBoost.color}99`,
            whiteSpace:'nowrap', zIndex:20,
          }}>{activeBoost.emoji} {activeBoost.label}</div>
        )}

        {/* LANDED */}
        {phase==='landed' && (
          <div style={{
            position:'absolute', top:'50%', left:'50%',
            transform:'translate(-50%,-50%)',
            background:'rgba(0,0,0,0.8)', border:'3px solid #ffd700',
            borderRadius:16, padding:'18px 32px', textAlign:'center', zIndex:25,
          }}>
            <div style={{color:'#ffd700',fontSize:16,fontWeight:900}}>🏁 LANDED!</div>
            <div style={{color:'white',fontSize:36,fontWeight:900,fontFamily:'monospace'}}>{score}</div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>Best: {bestScore}</div>
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <div style={{
        display:'flex',gap:8,padding:'8px 12px',
        background:'rgba(0,0,0,0.6)',borderTop:'1px solid rgba(255,255,255,0.06)',
        flexWrap:'wrap',justifyContent:'center',flexShrink:0,
      }}>
        {(phase==='idle'||phase==='landed') && (
          <button onClick={startNewRound} style={{background:'#228844',color:'#fff',fontWeight:900,border:'none',borderRadius:8,padding:'7px 20px',cursor:'pointer',fontSize:13}}>🚀 New Round</button>
        )}
        {phase==='tap_to_shoot' && (
          <button onClick={tapToShoot} style={{background:'#ff6600',color:'#fff',fontWeight:900,border:'none',borderRadius:8,padding:'7px 20px',cursor:'pointer',fontSize:14}}>💥 SHOOT!</button>
        )}
        {phase!=='idle'&&phase!=='auction'&&phase!=='chest_pick'&&phase!=='landed' && (
          <button onClick={resetRound} style={{background:'rgba(60,60,80,0.6)',color:'#aaa',border:'1px solid #444',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:12}}>↺ Reset</button>
        )}
        <span style={{color:'rgba(255,255,255,0.3)',fontSize:11,alignSelf:'center'}}>
          Best: <b style={{color:'#ffd700'}}>{bestScore||'—'}</b>
        </span>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function Cloud({ x, y, scale=1 }) {
  return (
    <div style={{position:'absolute',left:x,top:y,pointerEvents:'none'}}>
      <svg width={120*scale} height={55*scale} viewBox="0 0 120 55">
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
    <div style={{position:'absolute',left:x,top:y,pointerEvents:'none'}}>
      <svg width={68} height={90} viewBox="0 0 68 90">
        <defs>
          <radialGradient id="bg2" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#a8cc44"/>
            <stop offset="55%" stopColor="#7aaa22"/>
            <stop offset="100%" stopColor="#558800"/>
          </radialGradient>
        </defs>
        <ellipse cx={34} cy={30} rx={26} ry={32} fill="url(#bg2)" stroke="rgba(0,0,0,0.1)" strokeWidth={1}/>
        {[-12,0,12].map((sx,i)=>(
          <line key={i} x1={34+sx} y1={0} x2={34+sx} y2={60} stroke="rgba(255,255,255,0.3)" strokeWidth={2}/>
        ))}
        <rect x={26} y={63} width={16} height={13} rx={2} fill="#8b6914" stroke="#5a4510" strokeWidth={1.5}/>
        <line x1={26} y1={62} x2={22} y2={58} stroke="#8b6914" strokeWidth={1.2}/>
        <line x1={42} y1={62} x2={46} y2={58} stroke="#8b6914" strokeWidth={1.2}/>
      </svg>
    </div>
  );
}

function CannonSVG({ x, y, chargeLevel, phase, ballX }) {
  const barrelAngle = -(35+(chargeLevel/100)*6);
  const showSmoke = phase==='flying' && ballX<1.5;
  return (
    <svg style={{position:'absolute',left:x-40,top:y-28,zIndex:5,pointerEvents:'none'}}
      width={120} height={70} viewBox="0 0 120 70">
      <defs>
        <radialGradient id="wg" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#555"/><stop offset="100%" stopColor="#111"/>
        </radialGradient>
        <linearGradient id="bg3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#444"/><stop offset="40%" stopColor="#111"/><stop offset="100%" stopColor="#333"/>
        </linearGradient>
      </defs>
      {[[22,48],[55,48]].map(([wx,wy],i)=>(
        <g key={i}>
          <circle cx={wx} cy={wy} r={14} fill="url(#wg)" stroke="#222" strokeWidth={2.5}/>
          <circle cx={wx} cy={wy} r={5} fill="#1a1a1a"/>
          {[0,60,120,180,240,300].map(a=>(
            <line key={a}
              x1={wx+Math.cos(a*Math.PI/180)*5} y1={wy+Math.sin(a*Math.PI/180)*5}
              x2={wx+Math.cos(a*Math.PI/180)*12} y2={wy+Math.sin(a*Math.PI/180)*12}
              stroke="#2a2a2a" strokeWidth={1.5}/>
          ))}
        </g>
      ))}
      <rect x={14} y={28} width={50} height={20} rx={6} fill="#1a1208" stroke="#333" strokeWidth={2}/>
      <g transform={`rotate(${barrelAngle},38,34)`}>
        <rect x={30} y={28} width={62} height={17} rx={8} fill="rgba(0,0,0,0.25)" transform="translate(2,2)"/>
        <rect x={30} y={26} width={62} height={17} rx={8} fill="url(#bg3)" stroke="#444" strokeWidth={1.5}/>
        <circle cx={93} cy={34} r={9} fill="#555" stroke="#333" strokeWidth={1.5}/>
      </g>
      <path d="M 40 26 Q 48 16 46 10" stroke="#888" strokeWidth={1.5} fill="none"/>
      <circle cx={46} cy={9} r={4} fill="#ff5500"/>
      {showSmoke && (
        <>
          <circle cx={98} cy={34} r={12} fill="rgba(220,220,220,0.7)"/>
          <circle cx={110} cy={28} r={9} fill="rgba(220,220,220,0.6)"/>
        </>
      )}
    </svg>
  );
}

// ── Chest Pick Screen ──────────────────────────────────────────────────
// 9 mystery chests — clicking any reveals a random reward
function ChestPickScreen({ engine }) {
  const { phase, auctionBids, auctionWinner, chestsRemain, pickedChests, endAuction, pickChest } = engine;
  const picked = pickedChests || [];

  if (phase==='auction') return (
    <div style={{
      background:'#f5f0e4',
      backgroundImage:'linear-gradient(rgba(150,150,200,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(150,150,200,0.15) 1px,transparent 1px)',
      backgroundSize:'22px 22px',
      minHeight:520, width:'100%', display:'flex', flexDirection:'column',
      alignItems:'center', padding:'18px 14px', boxSizing:'border-box',
    }}>
      <div style={{fontSize:48,marginBottom:8}}>💥</div>
      <div style={{fontSize:15,fontWeight:900,color:'#333',marginBottom:16,textAlign:'center',fontFamily:"'Arial Black',Arial"}}>
        🏆 AUCTION — Highest gifter picks chests!
      </div>
      {Object.entries(auctionBids).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([u,c],i)=>(
        <div key={u} style={{display:'flex',gap:8,background:'rgba(255,215,0,0.15)',
          border:'1.5px solid rgba(200,150,0,0.4)',borderRadius:9,padding:'7px 14px',
          marginBottom:7,width:'92%',maxWidth:320}}>
          <span style={{fontSize:16}}>{['🥇','🥈','🥉','4.','5.'][i]}</span>
          <span style={{flex:1,fontWeight:700,fontSize:13}}>@{u}</span>
          <span style={{color:'#cc8800',fontWeight:900}}>{c.toLocaleString()} 💎</span>
        </div>
      ))}
      {Object.keys(auctionBids).length===0 && <p style={{color:'#888',fontSize:13}}>Waiting for gifts...</p>}
      <button onClick={endAuction} style={{
        marginTop:16,background:'linear-gradient(180deg,#ffd700,#cc9900)',
        color:'#000',fontWeight:900,border:'2px solid #8b6600',
        borderRadius:12,padding:'11px 28px',cursor:'pointer',fontSize:14,
        boxShadow:'0 3px 8px rgba(0,0,0,0.3)',
      }}>End Auction → Pick Chests</button>
      <button onClick={endAuction} style={{marginTop:8,background:'transparent',color:'#999',border:'none',cursor:'pointer',fontSize:12}}>
        Skip (no auction)
      </button>
    </div>
  );

  return (
    <div style={{
      background:'#f5f0e4',
      backgroundImage:'linear-gradient(rgba(150,150,200,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(150,150,200,0.15) 1px,transparent 1px)',
      backgroundSize:'22px 22px',
      width:'100%', minHeight:520, display:'flex', flexDirection:'column',
      alignItems:'center', padding:'10px 14px 16px', boxSizing:'border-box',
    }}>
      <div style={{fontSize:38,marginBottom:2,filter:'drop-shadow(0 3px 4px rgba(0,0,0,0.3))'}}>💥</div>

      {/* Wooden sign — shows possible reward types */}
      <div style={{
        background:'linear-gradient(180deg,#d49a40,#a06820 60%,#8b5510)',
        border:'3px solid #5a2808',borderRadius:8,padding:'10px 20px',
        marginBottom:12,boxShadow:'2px 4px 10px rgba(0,0,0,0.4)',
        width:'88%',maxWidth:260,
      }}>
        {CHEST_PICKS.map((c,i)=>(
          <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:i<2?6:0}}>
            <span style={{fontSize:18}}>{c.icon}</span>
            <span style={{flex:1,color:'#fff',fontWeight:700,fontSize:14,textShadow:'0 1px 3px rgba(0,0,0,0.6)'}}>{c.label}</span>
            <span style={{fontWeight:900,fontSize:16,color:i===0?'#ff8800':i===1?'#66ff00':'#ffdd00',textShadow:'0 1px 4px rgba(0,0,0,0.7)'}}>
              X {c.mult}x
            </span>
          </div>
        ))}
      </div>

      <div style={{fontWeight:900,fontSize:17,color:'#444',letterSpacing:2,marginBottom:14,
        fontFamily:"'Arial Black',Impact,Arial",textTransform:'uppercase'}}>
        PICK {chestsRemain} CHEST{chestsRemain!==1?'S':''}
      </div>

      {/* 9 mystery chests — each click picks one at random */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,82px)',gap:10}}>
        {Array.from({length:9},(_,i)=>{
          const isRevealed = i < picked.length;
          const revealedReward = isRevealed ? picked[i] : null;
          const isDisabled = chestsRemain<=0 && !isRevealed;

          return (
            <div key={i}
              onClick={()=>!isRevealed&&chestsRemain>0&&pickChest(i)}
              style={{
                width:82, height:72, cursor:isRevealed||chestsRemain<=0?'default':'pointer',
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                background: isRevealed
                  ? `linear-gradient(180deg,${revealedReward?.color||'#888'}44,${revealedReward?.color||'#666'}22)`
                  : 'linear-gradient(180deg,#d4883a 0%,#b06020 40%,#8b4210 100%)',
                border:`2.5px solid ${isRevealed?revealedReward?.color||'#777':'#5a2808'}`,
                borderRadius:10,
                boxShadow: isRevealed
                  ? `0 0 12px ${revealedReward?.color||'#888'}66`
                  : '2px 4px 8px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,200,100,0.3)',
                opacity:isDisabled?0.45:1,
                transition:'transform 0.1s,box-shadow 0.1s',
              }}
              onMouseEnter={e=>{if(!isRevealed&&chestsRemain>0)e.currentTarget.style.transform='scale(1.06)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';}}>
              {isRevealed ? (
                <>
                  <span style={{fontSize:26}}>{revealedReward?.icon||'✅'}</span>
                  <span style={{fontSize:9,fontWeight:900,color:revealedReward?.color||'#fff',marginTop:3,textAlign:'center'}}>
                    {revealedReward?.label}
                  </span>
                </>
              ) : (
                <div style={{width:44,height:38,position:'relative'}}>
                  <div style={{
                    position:'absolute',top:0,left:0,right:0,height:16,
                    background:'linear-gradient(180deg,#c87030,#a05018)',
                    borderRadius:'5px 5px 0 0',border:'1.5px solid #5a2808',borderBottom:'none',
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    <div style={{width:10,height:7,background:'#ffd700',borderRadius:2,border:'1px solid #cc9900'}}/>
                  </div>
                  <div style={{
                    position:'absolute',bottom:0,left:0,right:0,height:23,
                    background:'linear-gradient(180deg,#a06020,#7a4010)',
                    borderRadius:'0 0 5px 5px',border:'1.5px solid #5a2808',borderTop:'1px solid #8b5020',
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    <div style={{width:13,height:11,background:'#e8c000',borderRadius:'2px 2px 3px 3px',border:'1px solid #cc9900'}}/>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {chestsRemain<=0 && (
        <div style={{marginTop:14,color:'#228822',fontWeight:900,fontSize:14}}>✅ Ready to fire!</div>
      )}
    </div>
  );
}
