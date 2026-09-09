(() => {
  "use strict";
  const world = document.querySelector("#world");
  const canvas = document.querySelector("#flow");
  const ctx = canvas.getContext("2d");
  const equation = document.querySelector("#sourceEquation");
  const sourceNavier = document.querySelector("#sourceNavier");
  const sourceStokes = document.querySelector("#sourceStokes");
  const navierEl = document.querySelector("#navier");
  const stokesEl = document.querySelector("#stokes");
  const hint = document.querySelector("#touchHint");
  const infinity = document.querySelector("#infinity");
  const pageTurn = document.querySelector("#pageTurn");
  const epilogue = document.querySelector("#epilogue");
  const glyphs = ["Re = UL / ν","∂ρ/∂t + ∇・(ρv) = 0","Δp","ω = ∇×v","1  1  2  3  5  8  13","THEOREM","∫Ω","lim t→T","u₁ u₂ u₃","PRESSURE","DIVERGENCE","∑ᵢ vᵢ∂ᵢv","x y z","LEMMA 4.2","|v|² / 2","μ∇²v","0 < t < ∞","Q.E.D.","∇・v = 0","α β γ δ ε","C∞(Ω)","curl curl","f(x,t)","BOUNDARY","ρ(∂t + v・∇)v"];
  const state = { w:0,h:0,dpr:1,born:performance.now(),last:performance.now(),phase:"sleep",pointerDown:false,touched:false,pointer:{x:0,y:0},navier:{x:0,y:0,vx:0,vy:0,a:0},stokes:{x:0,y:0,vx:0,vy:0,a:0},trail:[],scroll:0,journey:0,orbit:0,endAt:0,bumps:0 };
  function resize() {
    const r=world.getBoundingClientRect(); state.w=r.width; state.h=r.height; state.dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(r.width*state.dpr); canvas.height=Math.round(r.height*state.dpr); ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
    if(state.phase==="sleep") placeAtEquation();
  }
  function centerOf(el) { const wr=world.getBoundingClientRect(),r=el.getBoundingClientRect(); return {x:r.left-wr.left+r.width/2,y:r.top-wr.top+r.height/2}; }
  function placeAtEquation() { const n=centerOf(sourceNavier),s=centerOf(sourceStokes); Object.assign(state.navier,n,{vx:0,vy:0}); Object.assign(state.stokes,s,{vx:0,vy:0}); put(navierEl,state.navier); put(stokesEl,state.stokes); }
  function awaken() {
    if(state.phase!=="sleep") return;
    placeAtEquation(); equation.classList.add("departed"); navierEl.classList.add("awake"); stokesEl.classList.add("awake"); state.phase="wake"; state.born=performance.now();
    state.trail=Array.from({length:110},()=>({x:state.navier.x,y:state.navier.y}));
    setTimeout(()=>{if(!state.touched) hint.classList.add("show");},1700);
  }
  function localPoint(e) { const r=world.getBoundingClientRect(); return {x:Math.max(0,Math.min(r.width,e.clientX-r.left)),y:Math.max(0,Math.min(r.height,e.clientY-r.top))}; }
  function pointerStart(e) { if(state.phase==="sleep"||state.phase==="ended") return; state.pointerDown=true; state.touched=true; state.pointer=localPoint(e); hint.classList.remove("show"); world.setPointerCapture?.(e.pointerId); }
  function currentAt(x,y,t) {
    if(state.phase==="vortex") { const dx=x-state.w*.5,dy=y-state.h*.5,d=Math.max(50,Math.hypot(dx,dy)); return {x:-dy/d*86,y:dx/d*86}; }
    const band=Math.sin((y+state.scroll*.65)*.015+t*.00045); return {x:30+band*19,y:Math.sin(x*.011+t*.00032)*26};
  }
  function obstacleRects() {
    const cols=Math.max(4,Math.ceil(state.w/180)),rows=Math.max(5,Math.ceil(state.h/135)),out=[];
    for(let row=0;row<rows+2;row++) for(let col=0;col<cols;col++) { const seed=row*19+col*37,x=30+col*state.w/cols+(seed%41),y=((row*143-state.scroll*.82+(seed%57))%(state.h+250)+state.h+250)%(state.h+250)-90,w=65+(seed%82),h=18+(seed%9),gap=(row+col)%4===0; if(!gap) out.push({x,y,w:Math.min(w,state.w-x-8),h,label:glyphs[seed%glyphs.length],seed}); }
    return out;
  }
  function collide(body,rects,el) {
    const radius=22;
    for(const r of rects) if(body.x+radius>r.x&&body.x-radius<r.x+r.w&&body.y+radius>r.y-5&&body.y-radius<r.y+r.h+5) {
      const fromLeft=Math.abs(body.x-r.x)<Math.abs(body.x-(r.x+r.w)); body.x=fromLeft?r.x-radius:r.x+r.w+radius; body.vx*=-.16; body.vy*=.42;
      if(el&&performance.now()-state.bumps>260){state.bumps=performance.now();el.classList.remove("bump");void el.offsetWidth;el.classList.add("bump");}
    }
  }
  function update(dt,now) {
    if(state.phase==="sleep"||state.phase==="ended") return;
    const age=(now-state.born)/1000;
    if(state.phase==="wake"&&age>2.2) state.phase="journey";
    if(state.phase==="journey") {
      const active=state.pointerDown;
      if(active) { const dx=state.pointer.x-state.navier.x,dy=state.pointer.y-state.navier.y,flow=currentAt(state.navier.x,state.navier.y,now),mag=Math.max(1,Math.hypot(dx,dy)),alignment=(dx*flow.x+dy*flow.y)/mag/Math.max(1,Math.hypot(flow.x,flow.y)),grip=5.2+Math.max(-.65,alignment)*3.1; state.navier.vx+=dx*grip*dt; state.navier.vy+=dy*grip*dt; }
      const flow=currentAt(state.navier.x,state.navier.y,now); state.navier.vx+=flow.x*dt*.82; state.navier.vy+=flow.y*dt*.82;
      const sep=dist(state.navier,state.stokes); if(sep>Math.min(190,state.w*.43)){const pull=norm(state.stokes.x-state.navier.x,state.stokes.y-state.navier.y);state.navier.vx+=pull.x*(sep-150)*4*dt;state.navier.vy+=pull.y*(sep-150)*4*dt;}
      dampMove(state.navier,dt,.014); const rects=obstacleRects(); collide(state.navier,rects,navierEl); clamp(state.navier);
      state.scroll+=dt*(active?40:22); state.journey+=dt*(active?1.35:.62); follow(dt,now,rects);
      if(state.journey>26) beginVortex(now);
    } else if(state.phase==="wake") {
      const target={x:state.w*.28,y:state.h*.42}; state.navier.x+=(target.x-state.navier.x)*dt*.7; state.navier.y+=(target.y-state.navier.y)*dt*.7; state.stokes.x+=(state.navier.x-72-state.stokes.x)*dt*.5; state.stokes.y+=(state.navier.y+32-state.stokes.y)*dt*.5; hint.style.left=`${state.navier.x}px`; hint.style.top=`${state.navier.y}px`;
    } else if(state.phase==="vortex") updateVortex(dt,now);
    put(navierEl,state.navier); put(stokesEl,state.stokes);
  }
  function follow(dt,now,rects) {
    state.trail.unshift({x:state.navier.x,y:state.navier.y}); if(state.trail.length>130) state.trail.pop();
    const target=state.trail[Math.min(34,state.trail.length-1)],flow=currentAt(state.stokes.x,state.stokes.y,now);
    state.stokes.vx+=(target.x-state.stokes.x)*2.15*dt+flow.x*.18*dt; state.stokes.vy+=(target.y-state.stokes.y)*2.15*dt+flow.y*.18*dt; dampMove(state.stokes,dt,.045); collide(state.stokes,rects,stokesEl); clamp(state.stokes);
  }
  function beginVortex(now) { state.phase="vortex"; state.endAt=now; infinity.classList.add("show"); state.orbit=Math.atan2(state.navier.y-state.h*.5,state.navier.x-state.w*.5); }
  function updateVortex(dt,now) {
    const cx=state.w*.5,cy=state.h*.5; let speed=.7;
    if(state.pointerDown){const a=Math.atan2(state.pointer.y-cy,state.pointer.x-cx);let da=a-state.orbit;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;if(da>0)speed+=Math.min(5,da/Math.max(dt,.016))*.7;}
    state.orbit+=speed*dt; const elapsed=(now-state.endAt)/1000,radius=Math.max(8,Math.min(state.w,state.h)*(.27-Math.min(.24,elapsed*.012)));
    state.navier.x=cx+Math.cos(state.orbit)*radius; state.navier.y=cy+Math.sin(state.orbit)*radius*.58; state.stokes.x=cx+Math.cos(state.orbit-.48)*(radius+8); state.stokes.y=cy+Math.sin(state.orbit-.48)*(radius+8)*.58; state.navier.a=speed>1.5?.08:0; state.stokes.a=-.05;
    if(elapsed>10.5) finish();
  }
  function finish() {
    if(state.phase==="ended")return; state.phase="ended"; navierEl.style.transition="all 1.2s ease-in"; stokesEl.style.transition="all 1.2s ease-in"; state.navier.x=state.stokes.x=state.w/2; state.navier.y=state.stokes.y=state.h/2; put(navierEl,state.navier); put(stokesEl,state.stokes); navierEl.style.opacity="0"; stokesEl.style.opacity="0"; setTimeout(()=>pageTurn.classList.add("turn"),750); setTimeout(()=>epilogue.classList.add("show"),1900);
  }
  function draw(now) {
    ctx.clearRect(0,0,state.w,state.h); if(state.phase==="sleep")return; ctx.save(); ctx.fillStyle="rgba(35,31,25,.54)"; ctx.strokeStyle="rgba(38,54,57,.18)"; const rects=obstacleRects(); ctx.textBaseline="top";
    rects.forEach(r=>{ctx.font=`${10+r.seed%7}px 'Noto Serif Math', serif`;ctx.globalAlpha=.42+(r.seed%4)*.08;ctx.fillText(r.label,r.x,r.y,r.w);if(r.seed%3===0){ctx.beginPath();ctx.moveTo(r.x,r.y+r.h);ctx.lineTo(r.x+r.w,r.y+r.h);ctx.stroke();}});
    ctx.globalAlpha=1;
    for(let y=40;y<state.h;y+=54){ctx.beginPath();for(let x=-30;x<=state.w+30;x+=14){const f=currentAt(x,y,now),yy=y+Math.sin(x*.013+now*.0004+y)*11;if(x<0)ctx.moveTo(x,yy);else ctx.lineTo(x+f.x*.07,yy+f.y*.07);}ctx.stroke();}
    if(state.trail.length>2){ctx.strokeStyle="rgba(34,30,25,.16)";ctx.beginPath();ctx.moveTo(state.trail[0].x,state.trail[0].y);state.trail.slice(1,75).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();} ctx.restore();
  }
  function dampMove(b,dt,damping){const d=Math.pow(damping,dt);b.vx*=d;b.vy*=d;b.x+=b.vx*dt;b.y+=b.vy*dt;b.a=Math.atan2(b.vy,b.vx)*.08;}
  function clamp(b){b.x=Math.max(28,Math.min(state.w-28,b.x));b.y=Math.max(62,Math.min(state.h-34,b.y));}
  function norm(x,y){const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};}
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function put(el,b){el.style.left=`${b.x}px`;el.style.top=`${b.y}px`;el.style.transform=`translate(-50%,-50%) rotate(${b.a||0}rad)`;}
  function frame(now){const dt=Math.min(.034,(now-state.last)/1000||.016);state.last=now;update(dt,now);draw(now);requestAnimationFrame(frame);}
  world.addEventListener("pointerdown",pointerStart); world.addEventListener("pointermove",e=>{if(state.pointerDown)state.pointer=localPoint(e);}); world.addEventListener("pointerup",()=>{state.pointerDown=false;}); world.addEventListener("pointercancel",()=>{state.pointerDown=false;}); document.querySelector("#retry").addEventListener("click",()=>location.reload()); addEventListener("resize",resize); resize(); requestAnimationFrame(frame); setTimeout(awaken,1250);
})();

