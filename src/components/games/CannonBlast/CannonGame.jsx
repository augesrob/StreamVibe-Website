/**
 * CannonGame v10 — Pixel-accurate Ball Guys Cannon Mode
 *
 * From screenshots:
 * - Sky blue background (light cartoon sky)
 * - Wooden platform rail in middle
 * - Sandy dirt below, sky + clouds above
 * - Black cannonball with username above it
 * - Numbered green/pink circles ON the rail as markers/speed bumps
 * - Reward boxes hanging below the rail
 * - Score box top-left, multipliers top-left
 * - "BALL GUYS" logo top-left
 */
import React, { useRef, useEffect } from 'react';
import { PX_PER_WU, CHEST_PICKS, GIFT_TIERS } from '@/hooks/useCannonEngine';

// ── Layout constants ──────────────────────────────────────────────────
const CW = 480;    // canvas width (portrait-ish)
const CH = 640;    // canvas height
const PX = PX_PER_WU;

// Platform sits at 55% of canvas height
const PLAT_Y    = Math.round(CH * 0.52);   // y of platform top surface
const PLAT_H    = 18;                       // platform thickness
const CANNON_CX = 70;                       // cannon x in canvas coords
const BALL_R    = 12;

// World → canvas
function wx2cx(wx, camX) { return CANNON_CX + (wx - camX) * PX; }
function wy2cy(wy)        { return PLAT_Y - wy * PX; }  // wy=0 → on platform

// ── Canvas renderer ───────────────────────────────────────────────────
export default function CannonGame({ engine }) {
  const canvasRef = useRef(null);
  const {
    phase, ballX, ballY, ballRot, ballUser, camX,
    score, bestScore, rewardLabel, markers, currentMark,
    chargeLevel, multipliers, activeBoost,
    auctionBids, auctionWinner, showChestPick, chestsRemain, pickedChests,
    startNewRound, tapToShoot, endAuction, pickChest, resetRound,
  } = engine;

  const showBall = phase === 'flying' || phase === 'rolling' || phase === 'landed';

  // ── Draw loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── Sky ──
    const skyGrad = ctx.createLinearGradient(0,0,0,PLAT_Y);
    skyGrad.addColorStop(0,   '#88c8f0');
    skyGrad.addColorStop(0.7, '#b8ddf8');
    skyGrad.addColorStop(1,   '#cce8f8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CW, PLAT_Y);

    // ── Ground (sand) ──
    const gndGrad = ctx.createLinearGradient(0,PLAT_Y+PLAT_H,0,CH);
    gndGrad.addColorStop(0,   '#d4a85a');
    gndGrad.addColorStop(0.3, '#c89040');
    gndGrad.addColorStop(1,   '#b07830');
    ctx.fillStyle = gndGrad;
    ctx.fillRect(0, PLAT_Y+PLAT_H, CW, CH-(PLAT_Y+PLAT_H));

    // ── Ground details (rocks, worms) ──
    ctx.fillStyle = '#a06828';
    [[80,PLAT_Y+PLAT_H+28,14,9],[200,PLAT_Y+PLAT_H+55,10,7],[350,PLAT_Y+PLAT_H+40,18,11]].forEach(([x,y,rx,ry])=>{
      ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill();
    });
    // Worm
    ctx.strokeStyle='#8b4513'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(160,PLAT_Y+PLAT_H+70); ctx.quadraticCurveTo(175,PLAT_Y+PLAT_H+60,190,PLAT_Y+PLAT_H+72); ctx.stroke();
    // Bone
    ctx.fillStyle='#f0e8d0';
    [[300,PLAT_Y+PLAT_H+80],[320,PLAT_Y+PLAT_H+80]].forEach(([x,y])=>{
      ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
    });
    ctx.fillRect(303,PLAT_Y+PLAT_H+77,17,6);

    // ── Clouds ──
    const drawCloud = (x, y, s) => {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      [[0,0,28],[20,-8,22],[40,0,26],[-18,-6,20]].forEach(([dx,dy,r]) => {
        ctx.beginPath(); ctx.arc(x+dx*s,y+dy*s,r*s,0,Math.PI*2); ctx.fill();
      });
    };
    const cOff = (camX * 0.15) % (CW+100);
    drawCloud(((140 - cOff + CW*3) % (CW+200))-100, 80, 0.9);
    drawCloud(((380 - cOff*0.7 + CW*3) % (CW+200))-100, 55, 0.7);
    if (score > 30) drawCloud(((220 - cOff*0.5 + CW*3) % (CW+200))-100, 120, 0.65);

    // Hot air balloon (appears ~score 40+)
    if (score > 40) {
      const bx2 = ((350 - (camX-40)*0.2 + CW*4) % (CW+300)) - 150;
      const by2 = 140 + Math.sin(Date.now()/2000)*8;
      ctx.save();
      ctx.translate(bx2, by2);
      // Balloon
      ctx.beginPath(); ctx.ellipse(0,-20,24,30,0,0,Math.PI*2);
      const bGrad = ctx.createRadialGradient(-8,-28,4,0,-20,28);
      bGrad.addColorStop(0,'#c8d040'); bGrad.addColorStop(0.5,'#88aa20'); bGrad.addColorStop(1,'#c07020');
      ctx.fillStyle=bGrad; ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1; ctx.stroke();
      // Basket
      ctx.fillStyle='#8b6914';
      ctx.fillRect(-8,12,16,10); ctx.strokeStyle='#5a4510'; ctx.lineWidth=1.5; ctx.strokeRect(-8,12,16,10);
      // Ropes
      ctx.strokeStyle='#8b6914'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-8,12); ctx.lineTo(-10,-4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8,12); ctx.lineTo(10,-4); ctx.stroke();
      ctx.restore();
    }

    // ── Platform (wooden rail) ──
    // Rail body
    const railGrad = ctx.createLinearGradient(0,PLAT_Y,0,PLAT_Y+PLAT_H);
    railGrad.addColorStop(0, '#c07a2a');
    railGrad.addColorStop(0.5,'#8b5510');
    railGrad.addColorStop(1, '#6a3a08');
    ctx.fillStyle = railGrad;
    ctx.fillRect(0, PLAT_Y, CW, PLAT_H);
    // Wood grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    for (let i=0; i<4; i++) {
      ctx.beginPath(); ctx.moveTo(0,PLAT_Y+3+i*4); ctx.lineTo(CW,PLAT_Y+3+i*4); ctx.stroke();
    }
    // Nail dots
    ctx.fillStyle='#5a2a08';
    for (let nx=30; nx<CW; nx+=40) {
      ctx.beginPath(); ctx.arc(nx, PLAT_Y+PLAT_H/2, 2.5, 0,Math.PI*2); ctx.fill();
    }
    // Top highlight
    ctx.fillStyle='rgba(255,220,120,0.35)';
    ctx.fillRect(0, PLAT_Y, CW, 3);

    // ── Markers (numbered circles on the rail) ──
    const visMarkers = markers.filter(m => {
      const cx2 = wx2cx(m.wx, camX);
      return cx2 > -30 && cx2 < CW+30;
    }).slice(0,12);

    visMarkers.forEach(mk => {
      const cx2 = wx2cx(mk.wx, camX);
      const isCurrent = mk.num === currentMark || (score >= mk.num-0.5 && score <= mk.num+0.5);
      const isPink = isCurrent;
      const r = 14;

      // Stem line from platform
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx2,PLAT_Y); ctx.lineTo(cx2,PLAT_Y-r); ctx.stroke();

      // Circle
      ctx.beginPath(); ctx.arc(cx2, PLAT_Y-r, r, 0, Math.PI*2);
      const cGrad = ctx.createRadialGradient(cx2-4,PLAT_Y-r-4,2,cx2,PLAT_Y-r,r);
      if (isPink) {
        cGrad.addColorStop(0,'#ff88cc'); cGrad.addColorStop(1,'#cc2288');
      } else {
        cGrad.addColorStop(0,'#88ee66'); cGrad.addColorStop(1,'#228822');
      }
      ctx.fillStyle=cGrad; ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=2; ctx.stroke();

      // Number
      ctx.fillStyle='white';
      ctx.font=`bold ${mk.num>99?9:mk.num>9?10:12}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(mk.num, cx2, PLAT_Y-r);

      // Reward box below platform
      const reward = mk.reward;
      const bx3 = cx2-16; const bY = PLAT_Y+PLAT_H+6;
      ctx.fillStyle = reward.type==='diamond'?'#8822ee':reward.type==='skin'?'#f0f0f0':'#f8f8f8';
      ctx.strokeStyle = reward.type==='diamond'?'#6600cc':reward.type==='skin'?'#aaaaaa':'#ccaa00';
      ctx.lineWidth=1.5;
      roundRect(ctx, bx3, bY, 32, 28, 5);
      ctx.fill(); ctx.stroke();
      // Icon
      ctx.font='11px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle = reward.type==='diamond'?'#ffffff':'#885500';
      ctx.fillText(reward.icon, cx2, bY+10);
      // Label
      ctx.font='bold 7.5px Arial'; ctx.fillStyle='#333';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(reward.label, cx2, bY+21);
    });

    // ── Cannon ──
    const cannonY = PLAT_Y;
    ctx.save();
    ctx.translate(CANNON_CX, cannonY);
    // Wheels
    [[-18,4],[14,4]].forEach(([dx,dy])=>{
      ctx.beginPath(); ctx.arc(dx,dy,15,0,Math.PI*2);
      const wg=ctx.createRadialGradient(dx-4,dy-4,2,dx,dy,15);
      wg.addColorStop(0,'#444'); wg.addColorStop(1,'#111');
      ctx.fillStyle=wg; ctx.fill();
      ctx.strokeStyle='#333'; ctx.lineWidth=2.5; ctx.stroke();
      // Spokes
      ctx.strokeStyle='#333'; ctx.lineWidth=1.5;
      for(let a=0;a<6;a++){
        const ang=a*Math.PI/3;
        ctx.beginPath();
        ctx.moveTo(dx+Math.cos(ang)*6,dy+Math.sin(ang)*6);
        ctx.lineTo(dx+Math.cos(ang)*14,dy+Math.sin(ang)*14);
        ctx.stroke();
      }
    });
    // Carriage
    ctx.fillStyle='#1a1008'; ctx.strokeStyle='#333'; ctx.lineWidth=2;
    roundRect(ctx,-26,-12,56,22,6); ctx.fill(); ctx.stroke();
    // Barrel (pointing right-up at ~38°)
    const barAngle = -(38 + (chargeLevel/100)*5) * Math.PI/180;
    ctx.save();
    ctx.rotate(barAngle);
    // Barrel shadow
    ctx.fillStyle='rgba(0,0,0,0.3)';
    roundRect(ctx,2,2,65,20,10); ctx.fill();
    // Barrel
    const barGrad=ctx.createLinearGradient(0,-10,0,10);
    barGrad.addColorStop(0,'#333'); barGrad.addColorStop(0.5,'#111'); barGrad.addColorStop(1,'#222');
    ctx.fillStyle=barGrad; roundRect(ctx,0,-10,65,20,10); ctx.fill();
    ctx.strokeStyle='#444'; ctx.lineWidth=2; roundRect(ctx,0,-10,65,20,10); ctx.stroke();
    // Muzzle ring
    ctx.fillStyle='#444'; ctx.beginPath(); ctx.arc(66,0,11,0,Math.PI*2); ctx.fill();
    // Smoke puff (just after shot)
    if (phase==='flying' && ballX < 2) {
      ctx.fillStyle='rgba(220,220,220,0.7)';
      ctx.beginPath(); ctx.arc(76,0,14,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(88,-8,10,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    // Fuse spark
    ctx.fillStyle='#ff4400';
    ctx.beginPath(); ctx.arc(0,-14,4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#888'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(0,-14); ctx.quadraticCurveTo(8,-22,5,-28); ctx.stroke();
    ctx.restore();

    // ── Charge bar (during tap_to_shoot) ──
    if (phase==='tap_to_shoot' && chargeLevel>0) {
      const pct=chargeLevel/100;
      const col=pct<0.4?'#00e5ff':pct<0.7?'#ffd600':pct<0.9?'#ff6d00':'#ff1744';
      const bw=CW-120, bh=22, bx4=60, byt=14;
      ctx.fillStyle='rgba(0,0,0,0.7)';
      roundRect(ctx,bx4,byt,bw,bh,8); ctx.fill();
      ctx.fillStyle=col;
      roundRect(ctx,bx4+3,byt+3,Math.max(0,(bw-6)*pct),bh-6,6); ctx.fill();
      ctx.fillStyle='white'; ctx.font='bold 11px Arial Black,Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(pct<0.3?'🎁 GIFT TO CHARGE!':`⚡ ${Math.round(pct*100)}%`, CW/2, byt+bh/2);
    }

    // ── Ball (cannonball) ──
    if (showBall) {
      const bcx = wx2cx(ballX, camX);
      const bcy = wy2cy(ballY);
      if (bcx>-30 && bcx<CW+30) {
        ctx.save();
        ctx.translate(bcx, bcy);
        // Shadow
        ctx.fillStyle='rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(0, PLAT_Y-bcy+4, BALL_R*0.9, 5, 0,0,Math.PI*2); ctx.fill();
        // Ball
        ctx.rotate(ballRot * Math.PI/180);
        const ballGrad = ctx.createRadialGradient(-4,-4,2,0,0,BALL_R);
        ballGrad.addColorStop(0,'#666'); ballGrad.addColorStop(0.4,'#2a2a2a'); ballGrad.addColorStop(1,'#111');
        ctx.beginPath(); ctx.arc(0,0,BALL_R,0,Math.PI*2);
        ctx.fillStyle=ballGrad; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1; ctx.stroke();
        // Shine
        ctx.fillStyle='rgba(255,255,255,0.22)';
        ctx.beginPath(); ctx.ellipse(-4,-4,5,3,-Math.PI/4,0,Math.PI*2); ctx.fill();
        ctx.restore();
        // Username label
        if (ballUser) {
          ctx.font='bold 11px Arial';
          const tw=ctx.measureText('@'+ballUser).width;
          ctx.fillStyle='rgba(0,0,0,0.72)';
          roundRect(ctx,bcx-tw/2-5,bcy-BALL_R-22,tw+10,17,5); ctx.fill();
          ctx.fillStyle='white'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText('@'+ballUser, bcx, bcy-BALL_R-14);
        }
      }
    }

    // ── Score box (top-left) ──
    if (phase!=='idle'&&phase!=='auction'&&phase!=='chest_pick') {
      const scoreCol = score>100?'#44ff44':score>50?'#ffff00':'#ffaa00';
      ctx.fillStyle='rgba(240,220,160,0.95)';
      roundRect(ctx,6,6,130,52,6); ctx.fill();
      ctx.strokeStyle='#996600'; ctx.lineWidth=2; roundRect(ctx,6,6,130,52,6); ctx.stroke();
      ctx.fillStyle='#222'; ctx.font='bold 13px Arial'; ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText('Score:', 14, 12);
      ctx.fillStyle=scoreCol; ctx.font='bold 14px Arial Black,Arial';
      ctx.fillText(score, 68, 12);
      ctx.fillStyle='#222'; ctx.font='13px Arial'; ctx.textAlign='left';
      ctx.fillText('Rewards:', 14, 32);
      ctx.fillStyle=score>100?'#22aa22':'#999922'; ctx.font='bold 13px Arial';
      ctx.fillText(rewardLabel, 80, 32);
    }

    // ── BALL GUYS logo ──
    if (phase==='flying'||phase==='rolling'||phase==='landed') {
      ctx.fillStyle='rgba(30,30,60,0.7)';
      ctx.font='bold 20px Arial Black,Impact,Arial';
      ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText('BALL', 14, 62);
      ctx.fillText('GUYS', 14, 83);
    }

    // Multiplier panel (top-left, below score)
    if (phase!=='idle'&&phase!=='auction'&&phase!=='chest_pick') {
      const my = phase==='flying'||phase==='rolling'||phase==='landed' ? 110 : 62;
      ctx.fillStyle='rgba(240,220,160,0.9)';
      roundRect(ctx,6,my,82,58,6); ctx.fill();
      ctx.strokeStyle='#996600'; ctx.lineWidth=1.5; roundRect(ctx,6,my,82,58,6); ctx.stroke();
      [['🔫','3x',multipliers.launch],['💣','2x',multipliers.bombs],['⭐','4x',multipliers.power]].forEach(([icon,_,val],i)=>{
        ctx.font='12px Arial'; ctx.textAlign='left'; ctx.fillStyle='#222';
        ctx.fillText(icon, 12, my+8+i*18);
        ctx.font='bold 12px Arial'; ctx.fillStyle=i===0?'#ff4400':i===1?'#44aa00':'#ff8800';
        ctx.fillText(`${val}x`, 36, my+8+i*18);
      });
    }

    // ── Landing result ──
    if (phase==='landed') {
      ctx.fillStyle='rgba(0,0,0,0.6)';
      roundRect(ctx,CW/2-100,CH/2-60,200,80,14); ctx.fill();
      ctx.strokeStyle='#ffd700'; ctx.lineWidth=3; roundRect(ctx,CW/2-100,CH/2-60,200,80,14); ctx.stroke();
      ctx.fillStyle='#ffd700'; ctx.font='bold 16px Arial Black,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🏁 LANDED!', CW/2, CH/2-35);
      ctx.fillStyle='white'; ctx.font='bold 28px monospace';
      ctx.fillText(score, CW/2, CH/2);
      ctx.fillStyle='#aaa'; ctx.font='12px Arial';
      ctx.fillText('Best: '+bestScore, CW/2, CH/2+28);
    }

    // ── Active boost banner ──
    if (activeBoost) {
      ctx.fillStyle=activeBoost.color;
      roundRect(ctx,CW/2-130,CH-50,260,34,10); ctx.fill();
      ctx.fillStyle='black'; ctx.font='bold 13px Arial Black,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`${activeBoost.emoji} ${activeBoost.label}`, CW/2, CH-33);
    }

    // ── "Tap to Shoot!" prompt ──
    if (phase==='tap_to_shoot') {
      ctx.fillStyle='rgba(0,0,0,0.65)';
      ctx.font='bold 28px Arial Black,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      const tw=ctx.measureText('Tap To').width;
      ctx.fillText('Tap To', CW/2, CH/2-60);
      ctx.fillText('Shoot!', CW/2, CH/2-28);
      ctx.fillStyle='white';
      ctx.font='bold 28px Arial Black,Arial';
      ctx.fillText('Tap To', CW/2-1, CH/2-61);
      ctx.fillText('Shoot!', CW/2-1, CH/2-29);
    }

  }, [phase, ballX, ballY, ballRot, ballUser, camX, score, rewardLabel,
      markers, currentMark, chargeLevel, multipliers, activeBoost, showBall, bestScore]);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      background:'#0a0b14', borderRadius:12, overflow:'hidden',
      border:'2px solid rgba(255,255,255,0.07)' }}>

      {/* Chest pick overlay */}
      {(phase==='chest_pick'||phase==='auction') && (
        <ChestPickScreen engine={engine}/>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} width={CW} height={CH}
        onClick={tapToShoot}
        style={{ display: (phase==='chest_pick'||phase==='auction') ? 'none' : 'block',
          cursor: phase==='tap_to_shoot'?'pointer':'default',
          width:'100%', maxWidth:CW }}/>

      {/* Controls */}
      <div style={{ display:'flex', gap:8, padding:'8px 12px', background:'rgba(0,0,0,0.6)',
        borderTop:'1px solid rgba(255,255,255,0.06)', width:'100%', boxSizing:'border-box',
        flexWrap:'wrap', justifyContent:'center' }}>
        {(phase==='idle'||phase==='landed') && (
          <button onClick={startNewRound}
            style={{ background:'#22aa44', color:'#fff', fontWeight:900, border:'none',
              borderRadius:8, padding:'7px 18px', cursor:'pointer', fontSize:13 }}>
            🚀 New Round
          </button>
        )}
        {phase==='tap_to_shoot' && (
          <button onClick={tapToShoot}
            style={{ background:'#ff6600', color:'#fff', fontWeight:900, border:'none',
              borderRadius:8, padding:'7px 18px', cursor:'pointer', fontSize:13 }}>
            💥 SHOOT!
          </button>
        )}
        {phase!=='idle' && phase!=='landed' && phase!=='auction' && phase!=='chest_pick' && (
          <button onClick={resetRound}
            style={{ background:'rgba(80,80,80,0.5)', color:'#aaa', border:'1px solid #555',
              borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:12 }}>
            ↺ Reset
          </button>
        )}
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11, alignSelf:'center', marginLeft:8 }}>
          Best: <span style={{ color:'#ffd700', fontWeight:900 }}>{bestScore||'—'}</span>
        </span>
      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// ── Chest Pick Screen ─────────────────────────────────────────────────
// Matches screenshot 1: grid-paper bg, cannon, wooden sign, 3x3 chest grid
function ChestPickScreen({ engine }) {
  const { phase, auctionBids, auctionWinner, showChestPick,
          chestsRemain, pickedChests, multipliers, endAuction, pickChest,
          startNewRound, resetRound } = engine;

  if (phase === 'auction') return (
    <div style={{ background:'#f5f5e8', backgroundImage:'linear-gradient(rgba(180,180,220,0.25) 1px,transparent 1px),linear-gradient(90deg,rgba(180,180,220,0.25) 1px,transparent 1px)',
      backgroundSize:'24px 24px', minHeight:580, width:'100%', display:'flex',
      flexDirection:'column', alignItems:'center', padding:'16px 12px', boxSizing:'border-box' }}>
      <div style={{ fontSize:14, fontWeight:900, color:'#222', marginBottom:16, textAlign:'center' }}>
        🏆 AUCTION — Highest gifter picks chests!
      </div>
      {Object.entries(auctionBids).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([u,c],i)=>(
        <div key={u} style={{ display:'flex', gap:8, background:'rgba(255,215,0,0.15)',
          border:'1px solid rgba(255,215,0,0.4)', borderRadius:8, padding:'6px 12px',
          marginBottom:6, width:'90%', maxWidth:320 }}>
          <span>{['🥇','🥈','🥉','4.','5.'][i]}</span>
          <span style={{ flex:1, fontWeight:700 }}>@{u}</span>
          <span style={{ color:'#cc8800', fontWeight:900 }}>{c.toLocaleString()} 💎</span>
        </div>
      ))}
      <button onClick={endAuction} style={{ marginTop:16, background:'#ffd700', color:'#000',
        fontWeight:900, border:'none', borderRadius:10, padding:'10px 24px',
        cursor:'pointer', fontSize:14 }}>
        End Auction → Pick Chests
      </button>
      {Object.keys(auctionBids).length===0 && (
        <button onClick={()=>{ engine.syncPhase?.('tap_to_shoot') || endAuction(); }}
          style={{ marginTop:8, background:'#888', color:'#fff', border:'none',
            borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:12 }}>
          Skip Auction
        </button>
      )}
    </div>
  );

  // Chest pick phase — notebook background, cannon, wooden sign, 3x3 grid
  const allChests = Array.from({length:9},(_,i)=>i);
  const picked = pickedChests || [];

  return (
    <div style={{ background:'#f5f5e8',
      backgroundImage:'linear-gradient(rgba(160,160,200,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(160,160,200,0.2) 1px,transparent 1px)',
      backgroundSize:'22px 22px', width:'100%', minHeight:580,
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'8px 12px 16px', boxSizing:'border-box', fontFamily:"Arial,sans-serif" }}>

      {/* Cannon */}
      <div style={{ fontSize:13, color:'#555', marginBottom:2, marginTop:4 }}>
        <span style={{ fontSize:28 }}>💥</span>
      </div>
      <div style={{ fontSize:14, fontWeight:900, color:'#333', marginBottom:8 }}>
        {auctionWinner ? `🏆 @${auctionWinner.user} won!` : 'Pick your chests!'}
      </div>

      {/* Wooden sign showing current multipliers */}
      <div style={{ background:'linear-gradient(180deg,#d4a040,#a06820)',
        border:'3px solid #6a3a08', borderRadius:8, padding:'10px 18px',
        marginBottom:12, boxShadow:'2px 3px 8px rgba(0,0,0,0.4)', minWidth:220 }}>
        {CHEST_PICKS.map((c,i) => (
          <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:i<2?4:0 }}>
            <span style={{ fontSize:16 }}>{c.icon}</span>
            <span style={{ flex:1, color:'#fff', fontWeight:700, fontSize:13 }}>{c.label}</span>
            <span style={{ fontWeight:900, fontSize:15,
              color: i===0?'#ff4400':i===1?'#44cc00':'#ff8800' }}>
              X {picked.includes(c.id) ? c.mult+'x' : '?'}
            </span>
          </div>
        ))}
      </div>

      {/* Pick N chests label */}
      <div style={{ fontWeight:900, fontSize:16, color:'#444', letterSpacing:2,
        marginBottom:12, fontFamily:'Arial Black,Impact,Arial' }}>
        PICK {chestsRemain} CHEST{chestsRemain!==1?'S':''}
      </div>

      {/* 3×3 chest grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,80px)', gap:10, justifyContent:'center' }}>
        {allChests.map(i => {
          const chestTypes = CHEST_PICKS;
          const chestType = chestTypes[i % chestTypes.length];
          const isPicked = picked.length > i;
          const isDisabled = isPicked || picked.length >= 3-chestsRemain+(chestsRemain===0?0:0);

          return (
            <div key={i} onClick={()=>!isPicked&&chestsRemain>0&&pickChest(chestType.id)}
              style={{ width:80, height:72, cursor: isPicked||chestsRemain<=0?'default':'pointer',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                background: isPicked
                  ? 'linear-gradient(180deg,#c8c8c8,#999)'
                  : 'linear-gradient(180deg,#d4883a,#8b4510)',
                border: isPicked
                  ? '2.5px solid #888'
                  : `2.5px solid #5a2a08`,
                borderRadius:10,
                boxShadow: isPicked ? 'none' : '2px 3px 6px rgba(0,0,0,0.35)',
                opacity: isPicked ? 0.5 : 1,
                transform: isPicked ? 'none' : 'scale(1)',
                transition:'transform 0.1s',
              }}>
              {isPicked ? (
                <span style={{ fontSize:22 }}>{chestType.icon}</span>
              ) : (
                <>
                  <span style={{ fontSize:22 }}>🎁</span>
                  {/* Lock icon */}
                  <div style={{ width:12,height:14,background:'rgba(0,0,0,0.4)',
                    borderRadius:3,marginTop:3,border:'1.5px solid rgba(255,255,255,0.3)'}}/>
                </>
              )}
              {/* Multiplier label on last chest */}
              {i===8 && !isPicked && chestsRemain<=1 && (
                <span style={{ fontSize:11,fontWeight:900,color:'#ff4400',marginTop:2 }}>4x</span>
              )}
            </div>
          );
        })}
      </div>

      {chestsRemain <= 0 && (
        <div style={{ marginTop:14, color:'#228822', fontWeight:900, fontSize:14 }}>
          ✅ Chests picked! Get ready...
        </div>
      )}
    </div>
  );
}
