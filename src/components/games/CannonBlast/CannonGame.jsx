/**
 * CannonGame v11 — Pixel-accurate Ball Guys Cannon Mode
 * Based on exact analysis of gameplay screenshots
 *
 * KEY VISUAL SPECS FROM SCREENSHOTS:
 * - Portrait canvas ~430px wide × 580px tall
 * - Sky = light blue, takes up top ~55% of screen
 * - Platform rail = wooden brown bar at ~55% height, ~20px thick
 * - Sandy ground = tan/brown, bottom 45% of screen
 * - Cannon sits ON the platform on the left side
 * - Markers = large green circles (r=20px) with white numbers, ON TOP of rail
 *   spaced ~80-90px apart (only 3-4 visible at once)
 * - Pink/purple circle = current position marker
 * - Reward boxes hang BELOW the rail, one per marker
 * - Ball is a small dark cannonball (~12px radius)
 * - Username floats above ball
 * - Score box top-left: wooden frame, "Score: X\nRewards: Fair"
 * - Multiplier panel below score box
 * - "BALL GUYS" text in dark bold on left mid
 * - Clouds in sky, hot air balloon at higher scores
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { CHEST_PICKS, GIFT_TIERS } from '@/hooks/useCannonEngine';

// ── Canvas dimensions ─────────────────────────────────────────────────
const CW = 430;
const CH = 580;
const PLAT_Y = Math.round(CH * 0.54);  // platform top y
const PLAT_H = 22;
const RAIL_Y  = PLAT_Y + PLAT_H / 2;   // center of rail
const CANNON_X = 55;                    // cannon center x in canvas
const BALL_R = 13;
const MARKER_R = 20;                    // marker circle radius
const MARKER_SPACING = 85;             // px between markers on screen
const PX_PER_WU = MARKER_SPACING / 10; // world units between markers = 10

function wx2cx(wx, camX) {
  return CANNON_X + (wx - camX) * PX_PER_WU;
}
function wy2cy(wy) {
  return PLAT_Y - wy * PX_PER_WU;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function CannonGame({ engine }) {
  const canvasRef = useRef(null);
  const {
    phase, ballX, ballY, ballRot, ballUser, camX,
    score, bestScore, rewardLabel, markers, currentMark,
    chargeLevel, multipliers, activeBoost,
    showChestPick, chestsRemain, pickedChests, auctionBids, auctionWinner,
    startNewRound, tapToShoot, endAuction, pickChest, resetRound,
  } = engine;

  const showBall = phase === 'flying' || phase === 'rolling' || phase === 'landed';
  const inGame = phase !== 'idle' && phase !== 'auction' && phase !== 'chest_pick';

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);

    // ── Sky ──────────────────────────────────────────────────────────────
    const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAT_Y);
    skyGrad.addColorStop(0, '#72c0e8');
    skyGrad.addColorStop(0.6, '#9ed4f0');
    skyGrad.addColorStop(1, '#bde4f8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CW, PLAT_Y);

    // ── Clouds ────────────────────────────────────────────────────────────
    const drawCloud = (cx2, cy, s) => {
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.shadowColor = 'rgba(150,200,240,0.4)';
      ctx.shadowBlur = 8;
      [[0,0,22],[18,-7,18],[36,0,20],[-15,-5,16]].forEach(([dx,dy,r]) => {
        ctx.beginPath(); ctx.arc(cx2+dx*s, cy+dy*s, r*s, 0, Math.PI*2); ctx.fill();
      });
      ctx.shadowBlur = 0;
    };
    const cOff = (camX * 0.12) % (CW + 120);
    drawCloud(((110 - cOff + CW*3) % (CW+180)) - 90, 72, 1.1);
    drawCloud(((310 - cOff*0.8 + CW*3) % (CW+180)) - 90, 50, 0.85);
    drawCloud(((220 - cOff*0.6 + CW*3) % (CW+180)) - 90, 110, 0.72);

    // Hot air balloon (score > 35)
    if (score > 35 || phase === 'flying' || phase === 'rolling') {
      const bx2 = ((280 - (Math.max(0, camX-30))*0.18 + CW*4) % (CW+260)) - 130;
      const by2 = 150 + Math.sin(Date.now() / 1800) * 9;
      ctx.save(); ctx.translate(bx2, by2);
      // Envelope
      ctx.beginPath(); ctx.ellipse(0, -18, 22, 28, 0, 0, Math.PI*2);
      const bGrad = ctx.createRadialGradient(-6,-22,3, 0,-18,24);
      bGrad.addColorStop(0,'#a8cc44'); bGrad.addColorStop(0.5,'#7aaa22'); bGrad.addColorStop(1,'#558800');
      ctx.fillStyle = bGrad; ctx.fill();
      // Stripes
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=2;
      [-10,0,10].forEach(sx => {
        ctx.beginPath(); ctx.moveTo(sx,-46); ctx.lineTo(sx,10); ctx.stroke();
      });
      // Basket
      ctx.fillStyle='#8b6914'; ctx.strokeStyle='#5a4510'; ctx.lineWidth=1.5;
      roundRect(ctx,-10,14,20,14,3); ctx.fill(); ctx.stroke();
      // Ropes
      ctx.strokeStyle='#8b6914'; ctx.lineWidth=1.2;
      [[-8,10],[-10,14],[8,10],[10,14]].forEach(([x,y],i,arr) => {
        if(i%2===0){ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(arr[i+1][0],arr[i+1][1]); ctx.stroke(); }
      });
      ctx.restore();
    }

    // ── Sandy Ground ──────────────────────────────────────────────────────
    const gndGrad = ctx.createLinearGradient(0, PLAT_Y+PLAT_H, 0, CH);
    gndGrad.addColorStop(0, '#d4a858');
    gndGrad.addColorStop(0.15, '#c49040');
    gndGrad.addColorStop(1, '#a87030');
    ctx.fillStyle = gndGrad;
    ctx.fillRect(0, PLAT_Y + PLAT_H, CW, CH - PLAT_Y - PLAT_H);

    // Ground texture details
    ctx.fillStyle = 'rgba(140,90,30,0.5)';
    [[70,PLAT_Y+PLAT_H+30,18,10],[190,PLAT_Y+PLAT_H+60,12,8],[350,PLAT_Y+PLAT_H+45,22,12]].forEach(([x,y,rx,ry])=>{
      ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill();
    });
    // Worm
    ctx.strokeStyle='#7a3a10'; ctx.lineWidth=2.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(145,PLAT_Y+PLAT_H+75); ctx.quadraticCurveTo(162,PLAT_Y+PLAT_H+62,180,PLAT_Y+PLAT_H+78); ctx.stroke();
    // Bone
    ctx.fillStyle='#ede0c0';
    [[300,PLAT_Y+PLAT_H+90],[318,PLAT_Y+PLAT_H+90]].forEach(([bx,by2])=>{
      ctx.beginPath(); ctx.arc(bx,by2,5,0,Math.PI*2); ctx.fill();
    });
    ctx.fillRect(303,PLAT_Y+PLAT_H+87,18,6);

    // ── Platform rail ─────────────────────────────────────────────────────
    const railGrad = ctx.createLinearGradient(0,PLAT_Y,0,PLAT_Y+PLAT_H);
    railGrad.addColorStop(0,'#cc8030');
    railGrad.addColorStop(0.4,'#a06018');
    railGrad.addColorStop(1,'#7a4208');
    ctx.fillStyle = railGrad;
    ctx.fillRect(0, PLAT_Y, CW, PLAT_H);
    // Wood grain
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
    [4,9,14,19].forEach(dy => {
      ctx.beginPath(); ctx.moveTo(0,PLAT_Y+dy); ctx.lineTo(CW,PLAT_Y+dy); ctx.stroke();
    });
    // Nails
    ctx.fillStyle = '#5a2808';
    for (let nx=25; nx<CW; nx+=50) {
      ctx.beginPath(); ctx.arc(nx, PLAT_Y+PLAT_H/2, 3, 0, Math.PI*2); ctx.fill();
    }
    // Top shine
    ctx.fillStyle='rgba(255,200,100,0.3)';
    ctx.fillRect(0, PLAT_Y, CW, 3);

    // ── Markers (numbered circles ON the rail) ──────────────────────────
    const visibleMarkers = (markers||[]).filter(m => {
      const cx2 = wx2cx(m.wx, camX);
      return cx2 > -MARKER_R-10 && cx2 < CW + MARKER_R + 10;
    });

    visibleMarkers.forEach(mk => {
      const cx2 = wx2cx(mk.wx, camX);
      const isCurrent = mk.num === currentMark;
      const r = MARKER_R;
      const cy2 = RAIL_Y - r;  // circle sits on top of rail

      // Drop shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;

      // Circle fill
      ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI*2);
      if (isCurrent) {
        // Pink/purple for current position
        const pg = ctx.createRadialGradient(cx2-5,cy2-5,3,cx2,cy2,r);
        pg.addColorStop(0,'#ff99dd'); pg.addColorStop(0.5,'#cc3388'); pg.addColorStop(1,'#882255');
        ctx.fillStyle = pg;
      } else {
        // Green circles
        const gg = ctx.createRadialGradient(cx2-5,cy2-5,3,cx2,cy2,r);
        gg.addColorStop(0,'#88ee66'); gg.addColorStop(0.5,'#44aa22'); gg.addColorStop(1,'#227700');
        ctx.fillStyle = gg;
      }
      ctx.fill();
      ctx.restore();

      // Border
      ctx.strokeStyle = isCurrent ? '#ff44aa' : '#33aa00';
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx2,cy2,r,0,Math.PI*2); ctx.stroke();

      // Number text
      ctx.fillStyle = 'white';
      ctx.font = `bold ${mk.num > 99 ? 9 : mk.num > 9 ? 11 : 13}px Arial Black, Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=3; ctx.shadowOffsetY=1;
      ctx.fillText(mk.num, cx2, cy2);
      ctx.shadowBlur=0; ctx.shadowOffsetY=0;

      // Reward box below platform
      const rw = mk.reward;
      const rbx = cx2 - 18; const rby = PLAT_Y + PLAT_H + 6;
      const rbW = 36, rbH = 30;
      // Box background
      ctx.fillStyle = rw.type==='diamond' ? '#9922ee' : rw.type==='skin' ? '#eeeeee' : '#f8f8f8';
      ctx.strokeStyle = rw.type==='diamond' ? '#7700cc' : rw.type==='skin' ? '#aaaaaa' : '#ccaa00';
      ctx.lineWidth = 2;
      roundRect(ctx, rbx, rby, rbW, rbH, 5); ctx.fill(); ctx.stroke();
      // Icon
      ctx.font = '13px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle = rw.type==='diamond'?'#ffffff':'#885500';
      ctx.fillText(rw.icon, cx2, rby+10);
      // Label
      ctx.font='bold 7px Arial'; ctx.fillStyle='#333'; ctx.textBaseline='middle';
      ctx.fillText(rw.label, cx2, rby+22);
    });

    // ── Cannon ───────────────────────────────────────────────────────────
    ctx.save(); ctx.translate(CANNON_X, PLAT_Y);
    // Wheels
    [[-18,6],[16,6]].forEach(([dx,dy]) => {
      ctx.beginPath(); ctx.arc(dx,dy,14,0,Math.PI*2);
      const wg=ctx.createRadialGradient(dx-4,dy-4,2,dx,dy,14);
      wg.addColorStop(0,'#555'); wg.addColorStop(1,'#111');
      ctx.fillStyle=wg; ctx.fill();
      ctx.strokeStyle='#333'; ctx.lineWidth=2.5; ctx.stroke();
      // Spokes
      ctx.strokeStyle='#2a2a2a'; ctx.lineWidth=1.5;
      for(let a=0;a<6;a++){
        const ang=a*Math.PI/3;
        ctx.beginPath();
        ctx.moveTo(dx+Math.cos(ang)*5,dy+Math.sin(ang)*5);
        ctx.lineTo(dx+Math.cos(ang)*12,dy+Math.sin(ang)*12);
        ctx.stroke();
      }
    });
    // Carriage body
    ctx.fillStyle='#1a1208'; ctx.strokeStyle='#333'; ctx.lineWidth=2;
    roundRect(ctx,-26,-10,54,20,5); ctx.fill(); ctx.stroke();
    // Barrel
    const bAng = -(35 + (chargeLevel/100)*6) * Math.PI/180;
    ctx.save(); ctx.rotate(bAng);
    // Barrel shadow
    ctx.fillStyle='rgba(0,0,0,0.25)';
    roundRect(ctx,4,3,62,19,9); ctx.fill();
    // Barrel body
    const barG=ctx.createLinearGradient(0,-9,0,9);
    barG.addColorStop(0,'#444'); barG.addColorStop(0.4,'#111'); barG.addColorStop(1,'#333');
    ctx.fillStyle=barG; roundRect(ctx,2,-9,62,18,9); ctx.fill();
    ctx.strokeStyle='#444'; ctx.lineWidth=1.5; roundRect(ctx,2,-9,62,18,9); ctx.stroke();
    // Muzzle ring
    ctx.fillStyle='#555'; ctx.beginPath(); ctx.arc(65,0,10,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#333'; ctx.lineWidth=1.5; ctx.stroke();
    // Smoke puff after firing
    if (phase==='flying' && ballX<1.5) {
      ctx.fillStyle='rgba(220,220,220,0.75)';
      [0,10,18].forEach((r,i) => {
        ctx.beginPath(); ctx.arc(70+i*10, i%2===0?0:-6, 10+i*2, 0, Math.PI*2); ctx.fill();
      });
    }
    ctx.restore();
    // Fuse
    ctx.strokeStyle='#888'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(2,-12); ctx.quadraticCurveTo(10,-22,8,-30); ctx.stroke();
    ctx.fillStyle='#ff5500';
    ctx.beginPath(); ctx.arc(8,-30,4,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // ── Charge bar ────────────────────────────────────────────────────────
    if (phase==='tap_to_shoot' && chargeLevel>0) {
      const pct=chargeLevel/100;
      const col=pct<0.4?'#00ddff':pct<0.7?'#ffd600':pct<0.9?'#ff7700':'#ff1122';
      const bw=CW-100,bh=26,bxc=50,byc=16;
      ctx.fillStyle='rgba(0,0,0,0.72)';
      roundRect(ctx,bxc,byc,bw,bh,10); ctx.fill();
      ctx.fillStyle=col;
      roundRect(ctx,bxc+3,byc+3,Math.max(0,(bw-6)*pct),bh-6,8); ctx.fill();
      ctx.fillStyle='white'; ctx.font='bold 12px Arial Black,Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=4;
      ctx.fillText(pct<0.25?'🎁 GIFT TO CHARGE!':`⚡ ${Math.round(pct*100)}% CHARGED`, CW/2, byc+bh/2);
      ctx.shadowBlur=0;
    }

    // ── Ball ─────────────────────────────────────────────────────────────
    if (showBall) {
      const bcx=wx2cx(ballX,camX), bcy=wy2cy(ballY);
      if (bcx>-30 && bcx<CW+30) {
        // Shadow on ground when airborne
        if (ballY > 0.5) {
          ctx.fillStyle='rgba(0,0,0,0.18)';
          ctx.beginPath(); ctx.ellipse(bcx,PLAT_Y,BALL_R*0.85,4,0,0,Math.PI*2); ctx.fill();
        }
        ctx.save(); ctx.translate(bcx,bcy); ctx.rotate(ballRot*Math.PI/180);
        const ballG=ctx.createRadialGradient(-4,-4,2,0,0,BALL_R);
        ballG.addColorStop(0,'#777'); ballG.addColorStop(0.4,'#2a2a2a'); ballG.addColorStop(1,'#0d0d0d');
        ctx.beginPath(); ctx.arc(0,0,BALL_R,0,Math.PI*2);
        ctx.fillStyle=ballG; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.stroke();
        // Shine
        ctx.fillStyle='rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.ellipse(-4,-4,5,3,-Math.PI/4,0,Math.PI*2); ctx.fill();
        ctx.restore();
        // Username
        if (ballUser) {
          const label='@'+ballUser.slice(0,14);
          ctx.font='bold 11px Arial';
          const tw=ctx.measureText(label).width;
          ctx.fillStyle='rgba(0,0,0,0.75)';
          roundRect(ctx,bcx-tw/2-5,bcy-BALL_R-22,tw+10,16,4); ctx.fill();
          ctx.fillStyle='white'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText(label,bcx,bcy-BALL_R-14);
        }
      }
    }

    // ── "Tap To Shoot!" prompt ────────────────────────────────────────────
    if (phase==='tap_to_shoot') {
      ctx.font='bold 30px Arial Black,Impact,Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      const lines=['Tap To','Shoot!'];
      lines.forEach((line,i) => {
        ctx.fillStyle='rgba(0,0,0,0.55)';
        ctx.fillText(line, CW/2+2, CH/2-52+i*38+2);
        ctx.fillStyle='white';
        ctx.fillText(line, CW/2, CH/2-52+i*38);
      });
    }

    // ── Score box top-left ────────────────────────────────────────────────
    if (inGame) {
      // Wooden frame
      ctx.fillStyle='rgba(240,215,150,0.95)';
      ctx.strokeStyle='#8b5510'; ctx.lineWidth=2.5;
      roundRect(ctx,6,6,128,54,7); ctx.fill(); ctx.stroke();
      // Inner border
      ctx.strokeStyle='rgba(100,60,10,0.3)'; ctx.lineWidth=1;
      roundRect(ctx,9,9,122,48,5); ctx.stroke();
      // Score line
      ctx.fillStyle='#222'; ctx.font='bold 13px Arial'; ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText('Score:', 14, 14);
      const scoreColor=score>100?'#22aa22':score>50?'#aa9900':'#cc5500';
      ctx.fillStyle=scoreColor; ctx.font='bold 15px Arial Black,Arial';
      ctx.fillText(score, 70, 13);
      // Arrow
      ctx.fillStyle='#cc7700'; ctx.font='12px Arial';
      ctx.fillText('→', 70+(String(score).length*9)+2, 15);
      // Rewards
      ctx.fillStyle='#222'; ctx.font='13px Arial'; ctx.textAlign='left';
      ctx.fillText('Rewards:', 14, 34);
      const rl=rewardLabel||'Poor';
      ctx.fillStyle=rl==='Good'?'#228822':rl==='Fair'?'#888822':'#cc5500';
      ctx.font='bold 13px Arial'; ctx.fillText(rl, 82, 34);
    }

    // ── Multiplier panel ─────────────────────────────────────────────────
    if (inGame) {
      const my = 64;
      ctx.fillStyle='rgba(240,215,150,0.95)';
      ctx.strokeStyle='#8b5510'; ctx.lineWidth=2;
      roundRect(ctx,6,my,80,60,6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(100,60,10,0.25)'; ctx.lineWidth=1;
      roundRect(ctx,9,my+3,74,54,4); ctx.stroke();
      [['🔫',multipliers.launch,'#ff4400'],
       ['💣',multipliers.bombs,'#44aa00'],
       ['⭐',multipliers.power,'#ff8800']].forEach(([icon,val,col],i)=>{
        ctx.font='13px Arial'; ctx.textAlign='left'; ctx.fillStyle='#222';
        ctx.fillText(icon, 12, my+10+i*18);
        ctx.font='bold 13px Arial'; ctx.fillStyle=col;
        ctx.fillText(`${val}x`, 34, my+10+i*18);
      });
    }

    // ── BALL GUYS logo ────────────────────────────────────────────────────
    if (inGame) {
      ctx.fillStyle='rgba(20,20,40,0.75)';
      ctx.font='bold 22px Arial Black,Impact,Arial';
      ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=4;
      ctx.fillText('BALL', 14, 128);
      ctx.fillText('GUYS', 14, 152);
      ctx.shadowBlur=0;
    }

    // ── Boost banner ──────────────────────────────────────────────────────
    if (activeBoost) {
      ctx.fillStyle=activeBoost.color||'#ff6600';
      roundRect(ctx,CW/2-120,CH-55,240,36,10); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.font='bold 13px Arial Black,Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`${activeBoost.emoji} ${activeBoost.label}`,CW/2,CH-37);
    }

    // ── Landing overlay ───────────────────────────────────────────────────
    if (phase==='landed') {
      ctx.fillStyle='rgba(0,0,0,0.62)';
      roundRect(ctx,CW/2-110,CH/2-70,220,90,16); ctx.fill();
      ctx.strokeStyle='#ffd700'; ctx.lineWidth=3;
      roundRect(ctx,CW/2-110,CH/2-70,220,90,16); ctx.stroke();
      ctx.fillStyle='#ffd700'; ctx.font='bold 16px Arial Black,Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🏁  LANDED!', CW/2, CH/2-42);
      ctx.fillStyle='white'; ctx.font='bold 32px monospace';
      ctx.fillText(score, CW/2, CH/2);
      ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='12px Arial';
      ctx.fillText(`Best: ${bestScore}`, CW/2, CH/2+30);
    }

  }, [phase, ballX, ballY, ballRot, ballUser, camX, score, bestScore,
      rewardLabel, markers, currentMark, chargeLevel, multipliers,
      activeBoost, showBall, inGame]);

  // Redraw on every state change
  useEffect(() => { draw(); }, [draw]);

  return (
    <div style={{ background:'#0a0b14', borderRadius:14, overflow:'hidden',
      border:'2px solid rgba(255,255,255,0.07)', display:'inline-flex',
      flexDirection:'column', alignItems:'stretch', width:'100%' }}>

      {/* Auction / Chest pick screens */}
      {(phase==='chest_pick'||phase==='auction') && (
        <ChestPickScreen engine={engine}/>
      )}

      {/* Main canvas */}
      <canvas ref={canvasRef} width={CW} height={CH}
        onClick={tapToShoot}
        style={{
          display: (phase==='chest_pick'||phase==='auction') ? 'none' : 'block',
          cursor: phase==='tap_to_shoot' ? 'pointer' : 'default',
          width:'100%',
        }}/>

      {/* Bottom controls */}
      <div style={{ display:'flex', gap:8, padding:'8px 12px',
        background:'rgba(0,0,0,0.55)', borderTop:'1px solid rgba(255,255,255,0.06)',
        flexWrap:'wrap', justifyContent:'center' }}>
        {(phase==='idle'||phase==='landed') && (
          <button onClick={startNewRound}
            style={{ background:'#228844', color:'#fff', fontWeight:900,
              border:'none', borderRadius:8, padding:'7px 20px', cursor:'pointer', fontSize:13 }}>
            🚀 New Round
          </button>
        )}
        {phase==='tap_to_shoot' && (
          <button onClick={tapToShoot}
            style={{ background:'#ff6600', color:'#fff', fontWeight:900,
              border:'none', borderRadius:8, padding:'7px 20px', cursor:'pointer', fontSize:14 }}>
            💥 SHOOT!
          </button>
        )}
        {phase!=='idle'&&phase!=='auction'&&phase!=='chest_pick' && (
          <button onClick={resetRound}
            style={{ background:'rgba(60,60,80,0.6)', color:'#aaa',
              border:'1px solid #444', borderRadius:8, padding:'6px 14px',
              cursor:'pointer', fontSize:12 }}>
            ↺ Reset
          </button>
        )}
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11, alignSelf:'center' }}>
          Best: <b style={{color:'#ffd700'}}>{bestScore||'—'}</b>
        </span>
      </div>
    </div>
  );
}

// ── Chest Pick Screen (matches Screenshot 1 exactly) ──────────────────
function ChestPickScreen({ engine }) {
  const { phase, auctionBids, auctionWinner, chestsRemain,
          pickedChests, endAuction, pickChest } = engine;

  if (phase === 'auction') return (
    <div style={{
      background:'#f5f0e4',
      backgroundImage:'linear-gradient(rgba(150,150,200,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(150,150,200,0.18) 1px,transparent 1px)',
      backgroundSize:'22px 22px',
      minHeight:540, width:'100%', display:'flex', flexDirection:'column',
      alignItems:'center', padding:'16px 14px', boxSizing:'border-box',
      fontFamily:"'Arial Black',Arial,sans-serif" }}>
      {/* Cannon emoji */}
      <div style={{ fontSize:48, marginBottom:8 }}>💥</div>
      <div style={{ fontSize:15, fontWeight:900, color:'#333', marginBottom:16, textAlign:'center' }}>
        🏆 AUCTION — Highest gifter picks chests!
      </div>
      {Object.entries(auctionBids).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([u,c],i)=>(
        <div key={u} style={{ display:'flex', gap:8, background:'rgba(255,215,0,0.18)',
          border:'1.5px solid rgba(200,150,0,0.4)', borderRadius:9, padding:'7px 14px',
          marginBottom:7, width:'92%', maxWidth:300 }}>
          <span style={{ fontSize:15 }}>{['🥇','🥈','🥉','4.','5.'][i]}</span>
          <span style={{ flex:1, fontWeight:700, fontSize:13 }}>@{u}</span>
          <span style={{ color:'#cc8800', fontWeight:900, fontSize:13 }}>{c.toLocaleString()} 💎</span>
        </div>
      ))}
      {Object.keys(auctionBids).length === 0 && (
        <div style={{ color:'#888', fontSize:13, marginBottom:16 }}>
          Waiting for gifts...
        </div>
      )}
      <button onClick={endAuction} style={{ marginTop:14, background:'linear-gradient(180deg,#ffd700,#cc9900)',
        color:'#000', fontWeight:900, border:'2px solid #8b6600', borderRadius:12,
        padding:'11px 28px', cursor:'pointer', fontSize:14, boxShadow:'0 3px 8px rgba(0,0,0,0.3)' }}>
        End Auction → Pick Chests
      </button>
      <button onClick={endAuction} style={{ marginTop:8, background:'transparent', color:'#999',
        border:'none', cursor:'pointer', fontSize:12 }}>
        Skip (no auction)
      </button>
    </div>
  );

  // Chest pick phase - exactly matches Screenshot 1
  const chestTypes = CHEST_PICKS;
  const picked = pickedChests || [];
  const totalChests = 9;

  return (
    <div style={{
      background:'#f5f0e4',
      backgroundImage:'linear-gradient(rgba(150,150,200,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(150,150,200,0.18) 1px,transparent 1px)',
      backgroundSize:'22px 22px',
      width:'100%', minHeight:540, display:'flex', flexDirection:'column',
      alignItems:'center', padding:'10px 14px 18px', boxSizing:'border-box',
      fontFamily:"Arial,sans-serif" }}>

      {/* Cannon at top */}
      <div style={{ fontSize:40, marginBottom:4, filter:'drop-shadow(0 3px 4px rgba(0,0,0,0.3))' }}>💥</div>

      {/* Wooden sign with multipliers */}
      <div style={{
        background:'linear-gradient(180deg,#d49a40 0%,#a06820 60%,#8b5510 100%)',
        border:'3px solid #5a2808', borderRadius:8, padding:'10px 20px',
        marginBottom:12, boxShadow:'2px 4px 10px rgba(0,0,0,0.4)',
        minWidth:220, maxWidth:280, width:'90%',
        position:'relative',
      }}>
        {/* Wood texture lines */}
        {[1,2,3].map(i=>(
          <div key={i} style={{ position:'absolute', left:0, right:0, top:`${i*25}%`,
            height:1, background:'rgba(0,0,0,0.1)' }}/>
        ))}
        {chestTypes.map((c,i)=>(
          <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8,
            marginBottom:i<chestTypes.length-1?6:0 }}>
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

      {/* "PICK N CHESTS" */}
      <div style={{ fontWeight:900, fontSize:17, color:'#444',
        letterSpacing:2, marginBottom:12, fontFamily:"'Arial Black',Impact,Arial",
        textTransform:'uppercase' }}>
        PICK {chestsRemain} CHEST{chestsRemain!==1?'S':''}
      </div>

      {/* 3×3 chest grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,86px)', gap:10 }}>
        {Array.from({length:totalChests},(_,i)=>{
          const isPicked = i < picked.length;
          const pickedChest = isPicked ? chestTypes.find(c=>c.id===picked[i]) : null;
          const isDisabled = chestsRemain <= 0 && !isPicked;
          const chestForSlot = chestTypes[i % chestTypes.length];

          return (
            <div key={i}
              onClick={()=>!isPicked&&chestsRemain>0&&pickChest(chestForSlot.id)}
              style={{
                width:86, height:76, cursor:isPicked||chestsRemain<=0?'default':'pointer',
                display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center',
                background: isPicked
                  ? 'linear-gradient(180deg,#b8b8b0,#888880)'
                  : 'linear-gradient(180deg,#d4883a 0%,#b06020 40%,#8b4210 100%)',
                border: isPicked
                  ? '2.5px solid #777'
                  : '2.5px solid #5a2808',
                borderRadius:10,
                boxShadow: isPicked
                  ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                  : '2px 4px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,200,100,0.3)',
                opacity: isDisabled ? 0.5 : 1,
                transform: !isPicked&&chestsRemain>0 ? 'scale(1)' : 'scale(1)',
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
              onMouseEnter={e=>{ if(!isPicked&&chestsRemain>0) e.currentTarget.style.transform='scale(1.05)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)'; }}>
              {isPicked ? (
                <>
                  <span style={{ fontSize:24 }}>{pickedChest?.icon||'✅'}</span>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.7)', marginTop:2 }}>
                    {pickedChest?.label}
                  </span>
                </>
              ) : (
                <>
                  {/* Chest graphic */}
                  <div style={{ width:44, height:36, position:'relative' }}>
                    {/* Chest lid */}
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:16,
                      background:'linear-gradient(180deg,#c87030,#a05018)',
                      borderRadius:'5px 5px 0 0', border:'1.5px solid #5a2808',
                      borderBottom:'none' }}>
                      <div style={{ position:'absolute', top:'50%', left:'50%',
                        transform:'translate(-50%,-50%)',
                        width:10, height:7, background:'#ffd700',
                        borderRadius:2, border:'1px solid #cc9900' }}/>
                    </div>
                    {/* Chest body */}
                    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:22,
                      background:'linear-gradient(180deg,#a06020,#7a4010)',
                      borderRadius:'0 0 5px 5px', border:'1.5px solid #5a2808',
                      borderTop:'1px solid #8b5020' }}>
                      {/* Lock */}
                      <div style={{ position:'absolute', top:'50%', left:'50%',
                        transform:'translate(-50%,-50%)',
                        width:12, height:10, background:'#e8c000',
                        borderRadius:'2px 2px 3px 3px', border:'1px solid #cc9900' }}/>
                    </div>
                  </div>
                  {/* 4x label on last chest */}
                  {i===8 && chestsRemain<=1 && (
                    <span style={{ fontSize:11,fontWeight:900,color:'#ff4400',
                      marginTop:3, textShadow:'0 1px 2px rgba(0,0,0,0.5)' }}>4x</span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {chestsRemain<=0 && (
        <div style={{ marginTop:14, color:'#228822', fontWeight:900, fontSize:14 }}>
          ✅ Ready to fire!
        </div>
      )}
    </div>
  );
}
