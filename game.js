(() => {
  "use strict";
  const canvas = document.querySelector("#field"), ctx = canvas.getContext("2d");
  const page = document.querySelector("#page"), leaf = document.querySelector("#leaf");
  const retry = document.querySelector("#retry"), status = document.querySelector("#status");
  const W = 700, H = 950, SIZE = 37.5, GAP = 2;
  const FONT = '"EB Garamond", Georgia, serif', MATH = '"Noto Serif Math", serif';
  const chapters = [
    ["Momentum balance", [
      "Consider an incompressible Newtonian fluid of constant density. Let v denote its velocity field and let p denote the pressure. The force F is measured per unit mass.",
      "The material derivative accounts for changes observed while moving with a fluid parcel. It combines local acceleration with transport through a nonuniform velocity field.",
      "The pressure gradient and viscous diffusion contribute to the balance of momentum. The coefficient nu is the kinematic viscosity.",
      "An initial velocity and suitable boundary conditions complete the formulation. The divergence constraint expresses conservation of volume."
    ]],
    ["Transport and diffusion", [
      "Transport carries momentum along trajectories of the velocity field. Since the same velocity determines both transport and the transported quantity, this contribution is nonlinear.",
      "Viscous diffusion acts to reduce spatial differences in velocity. Its relative importance depends on the length and velocity scales chosen for the flow.",
      "The Reynolds number compares inertial transport with viscous effects. A narrow region can support large gradients even when variations across the whole domain are modest.",
      "At a stationary solid boundary the no-slip condition fixes the fluid velocity. Away from this boundary the interior motion is determined by the momentum equation.",
      "Local estimates must be consistent with the constraint on divergence. Pressure couples motion in different parts of the domain."
    ]],
    ["Boundary conditions", [
      "A bounded domain requires conditions on its boundary. In a periodic domain opposite faces are identified, while in an unbounded domain conditions at infinity replace the wall.",
      "The choice of domain affects the available estimates. Integrating by parts transfers derivatives and may introduce boundary terms that must be retained or shown to vanish.",
      "For a smooth divergence-free velocity field, the transport term makes no net contribution to the kinetic energy balance under suitable boundary conditions.",
      "Viscosity dissipates kinetic energy through velocity gradients. An external force may supply energy, and the balance includes the work done by that force.",
      "Control of total energy does not by itself control every spatial derivative. More detailed information is needed to describe the smallest scales of motion.",
      "One therefore distinguishes the existence of weak solutions from the regularity of a classical solution."
    ]],
    ["Vorticity and regularity", [
      "Vorticity is the curl of the velocity field. In three dimensions the stretching of vortex lines provides a mechanism for changing its magnitude.",
      "Diffusion competes with stretching and transport. These processes are coupled rather than independent, since the velocity and vorticity determine one another through differential relations.",
      "Regularity estimates seek bounds that prevent derivatives from becoming unbounded. Their strength depends on the norms in which the solution is measured.",
      "A smooth initial field may contain motion on several length scales. Nonlinear interactions transfer information between these scales as the solution evolves.",
      "An a priori estimate is established before assuming the desired long-time behaviour. Such estimates form an essential part of many existence arguments.",
      "The energy inequality is a starting point. Additional control is required to justify stronger conclusions about smoothness and uniqueness.",
      "Any limiting procedure must preserve the equation and the divergence constraint. Convergence of the nonlinear term demands particular care."
    ]],
    ["Concluding remarks", [
      "The distinction between a formal calculation and a proof is crucial. Every limiting step must be justified, and every estimate must hold under the stated assumptions.",
      "A candidate singularity concerns the mathematical model. It does not assert that a physical fluid can attain an infinite speed.",
      "The continuum description represents matter through fields rather than individual molecules. The range of validity of this description is separate from the mathematical question of regularity.",
      "A conclusion must specify the domain, the initial data and the external force. Changing any of these assumptions may change the problem under consideration.",
      "Finite energy and bounded velocity are different requirements. Concentration on smaller sets can make this distinction significant.",
      "The geometry of a flow and the estimates used to study it must remain compatible throughout the argument.",
      "The equations join transport, pressure and diffusion in a single balance. Their interaction is the source of both their usefulness and their difficulty.",
      "This completes the discussion of the formulation. The final passage is left open."
    ]]
  ];
  const s = { phase:"still", time:0, index:0, words:[], walls:[], down:false,
    target:{x:130,y:210}, n:{x:180,y:210}, k:{x:459,y:210}, awake:false,
    trail:[], lost:0, turn:0, final:0, hidden:false, keys:new Set(), spin:0, wake:0,
    relation:"quiet", reunionAt:-100, pauseUntil:0, startledUntil:0, returnDistance:0,
    caption:"", captionAt:-100, reunionSeen:false };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function font(bold=false, math=false) { ctx.font=(bold?"600 ":"")+SIZE+"px "+(math?MATH:FONT); }
  function word(text,x,y,bold=false,math=false,hard=false) {
    font(bold,math);
    const w={text,x,y,w:ctx.measureText(text).width,bold,math,hard,dx:0,dy:0,glyphs:[]};
    let offset=0;
    for(const char of text) {
      const width=ctx.measureText(char).width;
      w.glyphs.push({char,x:x+offset,y,width,dx:0,dy:0,vx:0,vy:0});
      offset+=width+GAP;
    }
    w.w=Math.max(0,offset-GAP);s.words.push(w); return w;
  }
  function paragraph(text,x,y,width,bold=false) {
    let xx=x, yy=y; font(bold); const space=ctx.measureText(" ").width;
    for(const token of text.split(" ")) {
      font(bold); const widthWord=ctx.measureText(token).width+token.length*GAP;
      if(xx+widthWord>x+width && xx>x) {xx=x;yy+=48;}
      const item=word(token,xx,yy,bold); xx+=item.w+space;
    }
    return yy+48;
  }
  function layout() {
    s.words=[]; s.walls=[];
    const [title,paragraphs]=chapters[s.index];
    word("7."+(s.index+1),40,103,true);
    if(!s.index) {
      paragraph("Velocity v, pressure p.",40,156,606);
      let x=40;
      let row=235;
      for(const [text,tag] of [["∂v/∂t + ",null],["(v·∇)v","n"],[" = −∇p/ρ + ",null],["ν(∇²)v","k"],[" + F",null]]) {
        if(text.startsWith(" =")){x=40;row=307;}
        const w=word(text,x,row,false,true); w.actor=tag;
        if(tag) {font(false,true);w.w=ctx.measureText(text).width;s[tag]={x:x+w.w/2,y:row-6};s[tag+"Origin"]={...s[tag]};}
        x+=w.w+12;
      }
      word("∇·v = 0",284,390,false,true);
      paragraph("Momentum flows through space.",40,495,270);
      paragraph("Viscosity smooths motion.",395,650,265);
      paragraph("Initial velocity.",40,830,400);
    } else {
      // Alternating islands of type leave generous, connected corridors.
      const blocks=[[40,165,280],[385,350,270],[40,575,280],[385,755,270]];
      const labels=["Momentum and transport.","Pressure shapes the flow.","Viscous motion.","Energy and diffusion."];
      blocks.forEach(([x,y,width],i)=>paragraph(labels[i],x,y,width,i===2));
      word(s.index===1?"Re = UL/ν":"ω = ∇×v",350,590,false,true);
    }
    s.words=s.words.filter(w=>w.y<875);
    if(s.index===4) word("Q.E.D.",480,885,true);
  }
  function start(index=0) {
    s.index=index;s.phase=index?"travel":"still";s.time=0;s.awake=!!index;s.down=false;s.lost=0;s.spin=0;s.wake=0;s.keys.clear();
    s.relation="quiet";s.reunionAt=-100;s.pauseUntil=0;s.startledUntil=0;s.returnDistance=0;s.caption="";s.captionAt=-100;
    if(index===0)s.reunionSeen=false;
    retry.hidden=true;status.textContent="";layout();
    if(index){s.n={x:235,y:290};s.k={x:83,y:290};}
    s.particles=s.words.filter(w=>!w.actor).flatMap(w=>w.glyphs.filter(g=>g.char!==" "));
    settle();
    s.trail=[];s.target={...s.n};
  }
  function density(b,dt,ux=0,uy=0) {
    let sum=0;
    for(const w of s.words) {
      if(w.actor)continue;
      for(const g of w.glyphs) {
        if(g.char===" ")continue;
        const gx=g.x+g.dx+g.width/2,gy=g.y+g.dy-8;
        if(Math.abs(gx-b.x)<48&&Math.abs(gy-b.y)<22) {
          sum++;
        }
      }
    }
    return sum;
  }
  function actorBox(b) {
    font(false,true);
    const width=ctx.measureText(b===s.k?"ν(∇²)v":"(v·∇)v").width+8;
    return {x:b.x-width/2,y:b.y-31,w:width,h:45,fixed:true};
  }
  function boxes() {
    return [
      ...s.particles.map(g=>({x:g.x+g.dx-1,y:g.y+g.dy-35,w:g.width+2,h:43,g})),
      actorBox(s.n),actorBox(s.k)
    ];
  }
  function overlaps(a,b) {
    return Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.015 &&
      Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.015;
  }
  function settle() {
    // Project contacts before drawing. No frame is accepted with unresolved overlap.
    const list=boxes();
    const shift=(b,x,y)=>{
      if(b.fixed)return;
      b.x=clamp(b.x+x,20,680-b.w);b.y=clamp(b.y+y,76,900-b.h);
      b.g.dx=b.x+1-b.g.x;b.g.dy=b.y+35-b.g.y;
    };
    for(let pass=0;pass<40;pass++) {
      let contacts=0;
      list.sort((a,b)=>a.x-b.x);
      for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++){
        const a=list[i],b=list[j];
        // A conservative sweep; projection may change x during a pass.
        if(!overlaps(a,b))continue;
        contacts++;
        if(a.fixed&&b.fixed)return false;
        const px=Math.min(a.x+a.w-b.x,b.x+b.w-a.x)+.02;
        const py=Math.min(a.y+a.h-b.y,b.y+b.h-a.y)+.02;
        const sx=a.x+a.w/2<b.x+b.w/2?-1:1;
        const sy=a.y+a.h/2<b.y+b.h/2?-1:1;
        const portion=a.fixed?0:b.fixed?1:.5;
        if(px<py){shift(a,sx*px*portion,0);shift(b,-sx*px*(1-portion),0);}
        else{shift(a,0,sy*py*portion);shift(b,0,-sy*py*(1-portion));}
      }
      if(!contacts)return true;
    }
    return !list.some((a,i)=>list.slice(i+1).some(b=>overlaps(a,b)));
  }
  function snapshot(){return s.particles.map(g=>[g.dx,g.dy,g.vx,g.vy]);}
  function restore(saved){s.particles.forEach((g,i)=>{[g.dx,g.dy,g.vx,g.vy]=saved[i];});}
  function move(b,target,dt,speed) {
    const d=distance(b,target);if(d<.2)return;
    const step=Math.min(d,speed*dt*(density(b,dt,(target.x-b.x)/d,(target.y-b.y)/d)>0?2/3:1));
    let x=b.x+(target.x-b.x)/d*step, y=b.y+(target.y-b.y)/d*step;
    const saved=snapshot(),old={...b};
    const half=actorBox(b).w/2;
    for(const fraction of [1,.5,.25]) {
      restore(saved);
      b.x=clamp(old.x+(x-old.x)*fraction,20+half,680-half);
      b.y=clamp(old.y+(y-old.y)*fraction,125,875);
      if(settle())return;
    }
    restore(saved);Object.assign(b,old);
  }
  function turn() {
    s.phase="turn";s.turn=0;s.down=false;leaf.classList.remove("turn");
    void leaf.offsetWidth;leaf.classList.add("turn");
  }
  function say(text) {
    s.caption=text;s.captionAt=s.time;status.textContent=text;
  }
  function relationship(before,dt) {
    if(!s.awake||s.phase!=="travel")return;
    const d=distance(s.n,s.k);
    if(s.relation==="quiet"&&!s.reunionSeen&&s.time-s.wake>1&&d>195){
      s.relation="apart";s.startledUntil=s.time+1.5;
      // The follower notices the separation and hesitates once.
      move(s.k,{x:s.k.x-6,y:s.k.y},dt,38);
    }
    if(s.relation==="apart"){
      s.returnDistance+=Math.max(0,distance(before,s.k)-d);
      if(s.returnDistance>14&&d<180){
        s.relation="together";s.reunionSeen=true;s.reunionAt=s.time;
        s.pauseUntil=s.time+.65;s.lost=0;s.trail=[{...s.n}];
        say("待っててくれた。");
      }
    }
  }
  function update(dt) {
    s.time+=dt;
    const saved=snapshot();
    for(const g of (s.phase==="travel"?s.particles:[])) {
      const lastPage=s.index===4&&s.phase==="travel";
      if(lastPage&&s.spin>.1){
        const dx=g.x+g.dx-350,dy=g.y+g.dy-475;
        g.vx+=(-dy*.1-dx*.013)*s.spin*dt;
        g.vy+=(dx*.1-dy*.013)*s.spin*dt;
      }
      const restore=lastPage?.06:2.4;
      g.vx-=g.dx*restore*dt;g.vy-=g.dy*restore*dt;
      const drag=Math.exp(-dt*(lastPage?.7:4));
      g.vx*=drag;g.vy*=drag;g.dx+=g.vx*dt;g.dy+=g.vy*dt;
      g.dx=clamp(g.dx,21-g.x,679-g.x-g.width);g.dy=clamp(g.dy,111-g.y,892-g.y);
    }
    if(s.phase==="travel"&&!settle())restore(saved);
    if(s.phase==="still") {if(s.time>3)s.phase="notice";return;}
    if(s.phase==="notice") {if(s.time>5.5)s.phase="travel";return;}
    if(s.phase==="turn") {s.turn+=dt;if(s.turn>1.35)start(s.index+1);return;}
    if(s.phase==="failed"||s.phase==="end")return;
    if(s.phase==="travel"&&s.time<s.pauseUntil)return;
    if(s.phase==="vortex") {
      s.final+=dt;
      const t=s.final, a=t*(.3+t*.025),r=Math.max(0,1-t/12);
      for(const [b,origin,lag] of [[s.n,s.fn,0],[s.k,s.fk,.07]]) {
        const dx=origin.x-350,dy=origin.y-475;
        b.x=350+(dx*Math.cos(a-lag)-dy*Math.sin(a-lag))*r;
        b.y=475+(dx*Math.sin(a-lag)+dy*Math.cos(a-lag))*r;
      }
      if(t>15){s.phase="end";retry.hidden=false;status.textContent="";}
      return;
    }
    const before={...s.n};
    const kx=Number(s.keys.has("ArrowRight")||s.keys.has("d"))-Number(s.keys.has("ArrowLeft")||s.keys.has("a"));
    const ky=Number(s.keys.has("ArrowDown")||s.keys.has("s"))-Number(s.keys.has("ArrowUp")||s.keys.has("w"));
    if(kx||ky)move(s.n,{x:s.n.x+kx*150,y:s.n.y+ky*150},dt,205);
    else if(s.down)move(s.n,s.target,dt,205);
    if(s.index===4) {
      const a=Math.atan2(before.y-475,before.x-350),b=Math.atan2(s.n.y-475,s.n.x-350);
      const delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));
      if(distance(s.n,{x:350,y:475})>65)s.spin=Math.min(8,s.spin+Math.abs(delta)*1.1);
      if(s.spin>1.4)s.spin=Math.min(8,s.spin+dt*.16);
    }
    if(!s.awake&&s.n.x>580){s.awake=true;s.wake=s.time;}
    if(s.awake) {
      // Arc-length waypoints keep the follower on the player's actual route around walls.
      const last=s.trail[s.trail.length-1];
      if(!last||distance(last,s.n)>6)s.trail.push({...s.n});
      if(distance(s.n,s.k)<60)s.trail=[{...s.n}];
      while(s.trail.length>1&&distance(s.k,s.trail[0])<10)s.trail.shift();
      const goal=s.trail[0]||s.n;
      const followingDistance=s.relation==="together"?112:130;
      if(s.time>=s.startledUntil&&(distance(s.k,s.n)>followingDistance||s.trail.length>2))move(s.k,goal,dt,190);
      relationship(before,dt);
      const d=distance(s.n,s.k);
      if(d>320&&s.time-s.wake>5)s.lost+=dt;else s.lost=Math.max(0,s.lost-dt*2);
      status.textContent=d>260?"ストークスが離れています。迎えに戻れます。":"";
      if(s.lost>7) {s.phase="failed";s.down=false;retry.hidden=false;status.textContent="二人は離れてしまいました。同じページからやり直せます。";}
      if(s.time>=s.pauseUntil&&s.n.x>=675-actorBox(s.n).w/2&&s.k.x>450&&d<185) {
        if(s.index<4)turn();
        else if(s.spin>3.5){s.phase="vortex";s.final=0;s.fn={...s.n};s.fk={...s.k};s.down=false;}
      }
    }
  }
  function drawActor(b,text,alpha=1) {
    ctx.save();
    if(s.phase==="travel"){
      const reunionAge=s.time-s.reunionAt;
      const reunion=reunionAge>=0&&reunionAge<4;
      const nervous=b===s.k&&s.time<s.startledUntil;
      // Contract inside the collision rectangle; no mirrored or substituted glyphs.
      const breath=reunion?Math.sin(reunionAge*Math.PI*2)*.006:0;
      const scale=nervous?.976:1-Math.abs(breath);
      ctx.translate(b.x,b.y);ctx.scale(scale,scale);ctx.translate(-b.x,-b.y);
      alpha*=reunion?.94+Math.sin(reunionAge*Math.PI*2)*.06:nervous?.78:1;
    }
    if(s.phase==="vortex"){
      const t=s.final,r=Math.max(.01,1-t/12);
      ctx.translate(350,475);ctx.rotate(t*(.3+t*.025));ctx.scale(r,r);ctx.translate(-350,-475);
      b=b===s.k?s.fk:s.fn;
    }
    font(false,true);ctx.fillStyle="#282117";ctx.globalAlpha=alpha;
    ctx.fillText(text,b.x-ctx.measureText(text).width/2,b.y+6);
    ctx.restore();
  }
  function draw() {
    ctx.clearRect(0,0,W,H);ctx.save();ctx.fillStyle="#342b20";ctx.globalAlpha=.84;
    ctx.font="25px "+FONT;ctx.fillText("Elements of Fluid Dynamics",40,48);ctx.fillText(String(193+s.index),626,48);
    ctx.strokeStyle="#655744";ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(40,63);ctx.lineTo(660,63);ctx.stroke();
    if(s.phase==="end") {
      wordEnd();ctx.restore();return;
    }
    const vortex=s.phase==="vortex";
    for(const w of s.words) {
      if(w.actor==="n"&&(s.phase!=="still"))continue;
      if(w.actor==="k"&&s.awake)continue;
      ctx.save();font(w.bold,w.math);
      ctx.globalAlpha=.84;
      let x=w.x+w.dx,y=w.y+w.dy;
      if(vortex) {
        const t=s.final,a=t*(.3+t*.025),r=Math.max(.01,1-t/12);
        ctx.translate(350,475);ctx.rotate(a);ctx.scale(r,r);x-=350;y-=475;
      }
      if(w.hard)ctx.font="bold 18px sans-serif";
      if(w.actor)ctx.fillText(w.text,x,y);
      else for(const g of w.glyphs)ctx.fillText(g.char,x+(g.x-w.x)+g.dx,y+g.dy);
      ctx.restore();
    }
    if(s.phase!=="still") {
      const pulse=s.phase==="notice"?Math.sin((s.time-3)*Math.PI)*.08:0;
      drawActor(s.n,"(v·∇)v",.87+pulse);
    }
    if(s.awake)drawActor(s.k,"ν(∇²)v",
      s.phase==="failed"?.22:Math.max(.3,Math.min(.94,.5+(s.time-s.wake)*.22)-s.lost*.075));
    ctx.globalAlpha=.55;font();ctx.fillText("§ 7   /   "+(s.index+1),40,920);
    const captionAge=s.time-s.captionAt;
    if(s.caption&&captionAge>=0&&captionAge<4.5&&s.phase==="travel"){
      ctx.save();ctx.font='22px "Noto Serif JP", serif';ctx.fillStyle="#645849";
      ctx.globalAlpha=.76*Math.min(1,captionAge/.5,(4.5-captionAge)/.8);
      ctx.textAlign="right";ctx.fillText(s.caption,654,924);ctx.restore();
    }
    if(vortex) {
      ctx.globalAlpha=Math.min(1,s.final/4);ctx.font="68px "+MATH;
      ctx.fillStyle="#40372b";ctx.fillText("∞",318,493);
      const r=35+s.final*s.final*5;
      const glow=ctx.createRadialGradient(350,475,0,350,475,r);
      glow.addColorStop(0,"rgba(255,252,231,"+Math.min(1,s.final/7)+")");
      glow.addColorStop(1,"rgba(255,252,231,0)");
      ctx.globalAlpha=1;ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    }
    ctx.restore();
  }
  function wordEnd() {
    ctx.fillStyle="#30291f";font(true);ctx.fillText("7.6  Afterword",40,103);
    const lines=[
      "The Navier–Stokes equations describe the motion of fluids.",
      "Navier and Stokes developed them in the nineteenth century.",
      "",
      "An imagined journey through a real mathematical idea.",
      "",
      "The mathematics is real. The journey is fiction."
    ];
    font();let y=180;
    for(const line of lines){
      let row="";
      for(const token of line.split(" ")){
        if(ctx.measureText(row+token).width>600){ctx.fillText(row,40,y);y+=48;row="";}
        row+=token+" ";
      }
      ctx.fillText(row,40,y);y+=50;
    }
    ctx.globalAlpha=.55;ctx.fillText("An original typographic short film.",40,860);
  }
  function resize() {
    const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  }
  function target(e) {
    const r=canvas.getBoundingClientRect();s.target={x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};
  }
  page.addEventListener("pointerdown",e=>{
    if(s.phase!=="travel")return;s.down=true;target(e);page.setPointerCapture(e.pointerId);
  });
  page.addEventListener("pointermove",e=>{if(s.down)target(e);});
  for(const event of ["pointerup","pointercancel","lostpointercapture"])page.addEventListener(event,()=>s.down=false);
  addEventListener("keydown",e=>{
    const key=e.key.length===1?e.key.toLowerCase():e.key;
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].includes(key)){
      e.preventDefault();s.keys.add(key);
    }
  });
  addEventListener("keyup",e=>s.keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  addEventListener("blur",()=>{s.keys.clear();s.down=false;});
  retry.addEventListener("click",()=>start(s.phase==="end"?0:s.index));
  document.addEventListener("visibilitychange",()=>{s.hidden=document.hidden;s.down=false;});
  let last=performance.now();
  function frame(now){const dt=Math.min(.035,(now-last)/1000);last=now;if(!s.hidden){update(dt);draw();}requestAnimationFrame(frame);}
  addEventListener("resize",resize);
  document.fonts.load('22px "Noto Serif JP"',"待っててくれた。").catch(()=>{});
  Promise.all([document.fonts.load(SIZE+"px "+FONT),document.fonts.load("600 "+SIZE+"px "+FONT),document.fonts.load(SIZE+"px "+MATH)])
    .catch(()=>{}).then(()=>{resize();start();requestAnimationFrame(frame);});
})();
