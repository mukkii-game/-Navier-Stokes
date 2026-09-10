(() => {
  "use strict";
  const canvas = document.querySelector("#field"), ctx = canvas.getContext("2d");
  const page = document.querySelector("#page"), leaf = document.querySelector("#leaf");
  const retry = document.querySelector("#retry"), status = document.querySelector("#status");
  const W = 700, H = 950, SIZE = 18;
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
    trail:[], lost:0, turn:0, final:0, hidden:false };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function font(bold=false, math=false) { ctx.font=(bold?"600 ":"")+SIZE+"px "+(math?MATH:FONT); }
  function word(text,x,y,bold=false,math=false,hard=false) {
    font(bold,math);
    const w={text,x,y,w:ctx.measureText(text).width,bold,math,hard,dx:0,dy:0};
    s.words.push(w); return w;
  }
  function paragraph(text,x,y,width,bold=false) {
    let xx=x, yy=y; font(bold); const space=ctx.measureText(" ").width;
    for(const token of text.split(" ")) {
      font(bold); const widthWord=ctx.measureText(token).width;
      if(xx+widthWord>x+width && xx>x) {xx=x;yy+=24;}
      const item=word(token,xx,yy,bold); xx+=item.w+space;
    }
    return yy+24;
  }
  function layout() {
    s.words=[]; s.walls=[];
    const [title,paragraphs]=chapters[s.index];
    word("7."+(s.index+1)+"  "+title,40,103,true);
    if(!s.index) {
      paragraph(paragraphs[0],40,140,606);
      let x=65;
      for(const [text,tag] of [["∂v/∂t + ",null],["(v·∇)v","n"],[" = −∇p/ρ + ",null],["ν(∇²)v","k"],[" + F",null]]) {
        const w=word(text,x,224,false,true); w.actor=tag;
        if(tag) {s[tag]={x:x+w.w/2,y:218};s[tag+"Origin"]={...s[tag]};}
        x+=w.w;
      }
      word("∇·v = 0",284,264,false,true);
      let y=338;
      paragraphs.slice(1).forEach((p,i)=>{y=paragraph(p,40,y,606,i===1)+64;});
    } else {
      // Genuine prose is wrapped as prose; paragraph spacing decreases over the five pages.
      let y=155;
      const gap=[64,40,25,16,7][s.index];
      paragraphs.forEach((p,i)=>{
        y=paragraph(p,40,y,606,i===2)+gap;
        if(i===1) {word(s.index===1?"Re = UL/ν":s.index===2?"E(t) = ½ ∫ |v|² dx":"ω = ∇×v",190,y,false,true);y+=32+gap;}
      });
      // Bold, vertical section labels are solid ink barriers with a clear detour.
      const definitions=s.index===1?[[322,345,590]]:s.index===2?[[260,130,410],[465,525,830]]:
        s.index===3?[[240,155,490],[458,490,815]]:[[235,130,440],[458,475,830]];
      for(const [x,y1,y2] of definitions) {
        const label="BOUNDARY";
        const wall={x,y:y1,w:22,h:y2-y1}; s.walls.push(wall);
        // Clear a strip before setting the label to prevent unrelated text overprinting.
        s.words=s.words.filter(w=>!(w.x+w.w>x-5&&w.x<x+27&&w.y>y1-14&&w.y<y2+24));
        for(let y=y1+18,i=0;y<y2;y+=26,i++) word(label[i%label.length],x,y,true,false,true);
      }
    }
    s.words=s.words.filter(w=>w.y<875);
    if(s.index===4) word("Q.E.D.",594,885,true);
  }
  function start(index=0) {
    s.index=index;s.phase=index?"travel":"still";s.time=0;s.awake=!!index;s.down=false;s.lost=0;
    retry.hidden=true;status.textContent="";layout();
    if(index){s.n={x:82,y:305};s.k={x:40,y:305};}
    s.trail=[];s.target={...s.n};
  }
  function density(b,dt) {
    let sum=0;
    for(const w of s.words) {
      if(w.actor||w.hard)continue;
      const nx=clamp(b.x,w.x,w.x+w.w),ny=clamp(b.y,w.y-16,w.y+4);
      const d=Math.hypot(b.x-nx,b.y-ny);
      if(d<28) {
        sum+=(28-d)/28;
        if(dt) {w.dx=clamp(w.dx+(nx-b.x)*dt*1.8,-3,3);w.dy=clamp(w.dy+(ny-b.y)*dt*1.8,-3,3);}
      }
    }
    return sum;
  }
  function move(b,target,dt,speed) {
    const d=distance(b,target);if(d<.2)return;
    const step=Math.min(d,speed*dt/(1+density(b,dt)*1.5));
    let x=b.x+(target.x-b.x)/d*step, y=b.y+(target.y-b.y)/d*step;
    // Resolve separately so dragging down along a wall slides to its opening.
    const hit=(xx,yy)=>s.walls.some(w=>xx+32>w.x&&xx-32<w.x+w.w&&yy+10>w.y&&yy-10<w.y+w.h);
    if(!hit(x,b.y))b.x=x;
    if(!hit(b.x,y))b.y=y;
    b.x=clamp(b.x,34,666);b.y=clamp(b.y,125,894);
  }
  function turn() {
    s.phase="turn";s.turn=0;s.down=false;leaf.classList.remove("turn");
    void leaf.offsetWidth;leaf.classList.add("turn");
  }
  function update(dt) {
    s.time+=dt;
    for(const w of s.words) {w.dx*=Math.exp(-dt*3);w.dy*=Math.exp(-dt*3);}
    if(s.phase==="still") {if(s.time>3)s.phase="notice";return;}
    if(s.phase==="notice") {if(s.time>5.5)s.phase="travel";return;}
    if(s.phase==="turn") {s.turn+=dt;if(s.turn>1.35)start(s.index+1);return;}
    if(s.phase==="failed"||s.phase==="end")return;
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
    if(s.down)move(s.n,s.target,dt,150);
    if(!s.awake&&distance(s.n,s.nOrigin)>95)s.awake=true;
    if(s.awake) {
      // Arc-length waypoints keep the follower on the player's actual route around walls.
      const last=s.trail[s.trail.length-1];
      if(!last||distance(last,s.n)>6)s.trail.push({...s.n});
      if(distance(s.n,s.k)<60)s.trail=[{...s.n}];
      while(s.trail.length>1&&distance(s.k,s.trail[0])<10)s.trail.shift();
      const goal=s.trail[0]||s.n;
      if(distance(s.k,s.n)>43||s.trail.length>2)move(s.k,goal,dt,128);
      const d=distance(s.n,s.k);
      if(d>260)s.lost+=dt;else s.lost=Math.max(0,s.lost-dt*2);
      status.textContent=d>260?"ストークスが離れています。迎えに戻れます。":"";
      if(s.lost>7) {s.phase="failed";s.down=false;retry.hidden=false;status.textContent="二人は離れてしまいました。同じページからやり直せます。";}
      if(s.n.x>=654&&s.k.x>578&&d<125) {
        if(s.index<4)turn();
        else {s.phase="vortex";s.final=0;s.fn={...s.n};s.fk={...s.k};s.down=false;}
      }
    }
  }
  function drawActor(b,text,alpha=1) {
    font(false,true);ctx.fillStyle="#282117";ctx.globalAlpha=alpha;
    ctx.fillText(text,b.x-ctx.measureText(text).width/2,b.y+6);
  }
  function draw() {
    ctx.clearRect(0,0,W,H);ctx.save();ctx.fillStyle="#342b20";ctx.globalAlpha=.84;
    font();ctx.fillText("Elements of Fluid Dynamics",40,48);ctx.fillText(String(193+s.index),626,48);
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
      ctx.fillText(w.text,x,y);
      if(w.bold&&!w.hard){ctx.fillRect(x,y+3,w.w,.5);}
      ctx.restore();
    }
    if(s.phase!=="still") {
      const pulse=s.phase==="notice"?Math.sin((s.time-3)*Math.PI)*.08:0;
      drawActor({...s.n,y:s.n.y-pulse*9},"(v·∇)v",.87+pulse);
    }
    if(s.awake)drawActor(s.k,"ν(∇²)v",s.phase==="failed"?.22:Math.max(.3,.9-s.lost*.075));
    ctx.globalAlpha=.55;font();ctx.fillText("§ 7   /   "+(s.index+1),40,920);
    if(vortex) {
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
      "They developed from nineteenth-century work by",
      "Claude-Louis Navier, George Gabriel Stokes and others.",
      "",
      "Transport, pressure and viscosity belong to one balance.",
      "The two terms in this story belong to that equation.",
      "",
      "An imagined journey through a real mathematical idea.",
      "",
      "The mathematics is real. The journey is fiction."
    ];
    font();lines.forEach((line,i)=>ctx.fillText(line,40,180+i*32));
    ctx.globalAlpha=.55;ctx.fillText("Notes composed for this film; not a facsimile of a paper.",40,860);
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
  retry.addEventListener("click",()=>start(s.phase==="end"?0:s.index));
  document.addEventListener("visibilitychange",()=>{s.hidden=document.hidden;s.down=false;});
  let last=performance.now();
  function frame(now){const dt=Math.min(.035,(now-last)/1000);last=now;if(!s.hidden){update(dt);draw();}requestAnimationFrame(frame);}
  addEventListener("resize",resize);
  document.fonts.ready.then(()=>{resize();start();requestAnimationFrame(frame);});
})();
