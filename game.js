(() => {
  "use strict";

  const page = document.querySelector("#page");
  const book = document.querySelector("#book");
  const canvas = document.querySelector("#field");
  const ctx = canvas.getContext("2d");
  const equation = document.querySelector("#equation");
  const sourceNavier = document.querySelector("#sourceNavier");
  const sourceStokes = document.querySelector("#sourceStokes");
  const navierEl = document.querySelector("#navier");
  const stokesEl = document.querySelector("#stokes");
  const print = document.querySelector("#print");
  const folio = document.querySelector("#folio");
  const leaf = document.querySelector("#leaf");
  const light = document.querySelector("#light");
  const epilogue = document.querySelector("#epilogue");

  const fragments = [
    "∂u/∂t", "∇·v = 0", "ρ(v·∇)v", "−∂p/∂x", "ν∇²u", "ω = ∇×v",
    "Re = UL/ν", "0 < t < T", "u₁  u₂  u₃", "∫Ω |v|² dx", "lim t→T",
    "THEOREM", "LEMMA", "BOUNDARY", "PRESSURE", "DIVERGENCE",
    "α  β  γ", "x  y  z", "C∞(Ω)", "Q.E.D.", "1  1  2  3  5  8"
  ];

  const pages = [
    {
      folio: "193",
      title: "7. Motion of a viscous fluid",
      paragraphs: [
        "Let v denote the velocity field and p the pressure. The motion follows from conservation of momentum.",
        "These equations describe how the velocity, pressure, temperature, and density of a moving fluid are related.",
        "The influence of internal friction is represented by the coefficient of kinematic viscosity, denoted by ν.",
        "For an incompressible fluid of constant density, the equation may be written in vector notation as follows.",
        "The terms on the left describe local and convective acceleration. Pressure, diffusion and external force appear on the right.",
        "Viscosity tends to smooth differences of velocity between neighbouring regions of the fluid."
      ]
    },
    {
      folio: "194",
      title: "7.1 Transport and diffusion",
      paragraphs: [
        "A material element carries momentum from one region to another. The transport is nonlinear because the velocity determines its own direction of motion.",
        "Diffusion acts across neighbouring layers. Its influence depends upon the scale of variation and the value of ν.",
        "At large Reynolds number the motion may contain structures of many different sizes.",
        "The coupled equations must be considered together with initial and boundary conditions.",
        "Close trajectories may separate; distant parts of the field may be brought together by the flow.",
        "No individual symbol is aware of the field through which it passes."
      ]
    },
    {
      folio: "195",
      title: "7.2 Vorticity",
      paragraphs: [
        "Vorticity describes local rotation. Stretching can intensify a vortex while viscosity works to diffuse it.",
        "The geometry becomes increasingly fine. Large and small scales remain joined by the same equation.",
        "Suppose that smooth motion is given at the initial time.",
        "Can every derivative remain bounded for all later time?",
        "The question concerns the equation itself, beyond any particular experiment.",
        "The following page has not yet been written."
      ]
    }
  ];

  const state = {
    w: 0, h: 0, dpr: 1, last: performance.now(), born: performance.now(),
    phase: "still", pageNo: 0, journey: 0, turning: false,
    pointerDown: false, touched: false, pointer: { x: 0, y: 0 },
    navier: { x: 0, y: 0, vx: 0, vy: 0, r: 0 },
    stokes: { x: 0, y: 0, vx: 0, vy: 0, r: 0 },
    stokesAwake: false, trail: [], finalAt: 0, theta: 0, released: false
  };

  function resize() {
    const r = page.getBoundingClientRect();
    state.w = r.width; state.h = r.height; state.dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * state.dpr); canvas.height = Math.round(r.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    if (state.phase === "still") placeAtSource();
  }

  function centerOf(el) {
    const pr = page.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - pr.left + r.width / 2, y: r.top - pr.top + r.height / 2 };
  }

  function placeAtSource() {
    const n = centerOf(sourceNavier), s = centerOf(sourceStokes);
    Object.assign(state.navier, n, { vx: 0, vy: 0 });
    Object.assign(state.stokes, s, { vx: 0, vy: 0 });
    position(navierEl, state.navier); position(stokesEl, state.stokes);
  }

  function notice() {
    if (state.phase !== "still") return;
    placeAtSource();
    navierEl.classList.add("visible", "noticing");
    sourceNavier.style.opacity = ".18";
    state.phase = "notice";
    state.born = performance.now();
    setTimeout(depart, 3800);
  }

  function depart() {
    if (state.phase !== "notice") return;
    navierEl.classList.remove("noticing");
    equation.classList.add("navier-gone");
    page.classList.add("in-motion");
    state.phase = "travel";
    state.born = performance.now();
    state.pointer = { x: state.navier.x, y: state.navier.y };
    state.trail = Array.from({ length: 150 }, () => ({ x: state.navier.x, y: state.navier.y }));
  }

  function wakeStokes() {
    if (state.stokesAwake) return;
    state.stokesAwake = true;
    equation.classList.add("stokes-gone");
    stokesEl.classList.add("visible", "noticing");
    setTimeout(() => stokesEl.classList.remove("noticing"), 2300);
  }

  function localPoint(event) {
    const r = page.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(r.width, event.clientX - r.left)),
      y: Math.max(0, Math.min(r.height, event.clientY - r.top))
    };
  }

  function startPointer(event) {
    if (state.phase !== "travel" && state.phase !== "final") return;
    state.pointerDown = true; state.touched = true; state.pointer = localPoint(event);
    navierEl.classList.add("touching");
    page.setPointerCapture?.(event.pointerId);
  }

  function endPointer() {
    state.pointerDown = false; navierEl.classList.remove("touching");
  }

  function density() {
    return state.pageNo === 0 ? .55 : state.pageNo === 1 ? 1 : 1.42;
  }

  function currentAt(x, y, now) {
    const p = state.pageNo;
    const t = now * .00017;
    const viscosity = p === 0 ? .35 : p === 1 ? .76 : .92;
    return {
      x: (12 + 18 * Math.sin(y * .018 + t * (p + 1))) / viscosity,
      y: (8 + 16 * Math.sin(x * .014 - t * 1.7)) / viscosity
    };
  }

  function obstacles(now) {
    const result = [], count = Math.round((state.w * state.h) / 6200 * density());
    for (let i = 0; i < count; i++) {
      const seed = i * 73 + state.pageNo * 109;
      const drift = state.pageNo === 2 ? Math.sin(now * .00022 + seed) * 4 : 0;
      const x = 8 + ((seed * 17) % Math.max(40, state.w - 80)) + drift;
      const y = 42 + ((seed * 31 + state.pageNo * 47) % Math.max(80, state.h - 90));
      const size = (state.pageNo === 2 && i % 7 === 0 ? 25 : 8) + seed % (state.pageNo === 2 ? 24 : 9);
      const label = fragments[seed % fragments.length];
      const width = Math.min(state.w - x - 4, label.length * size * .48);
      if (width > 12) result.push({ x, y, w: width, h: size * 1.05, size, label, seed });
    }
    return result;
  }

  function collide(body, rects, drag) {
    const rx = 13, ry = 8;
    for (const o of rects) {
      if (body.x + rx > o.x && body.x - rx < o.x + o.w && body.y + ry > o.y && body.y - ry < o.y + o.h) {
        const left = Math.abs(body.x - o.x), right = Math.abs(body.x - o.x - o.w);
        if (Math.min(left, right) < Math.abs(body.y - o.y)) {
          body.x = left < right ? o.x - rx : o.x + o.w + rx; body.vx *= -.08;
        } else {
          body.y = body.y < o.y ? o.y - ry : o.y + o.h + ry; body.vy *= -.08;
        }
        body.vx *= drag; body.vy *= drag;
      }
    }
  }

  function updateTravel(dt, now) {
    const flow = currentAt(state.navier.x, state.navier.y, now);
    if (state.pointerDown) {
      const dx = state.pointer.x - state.navier.x, dy = state.pointer.y - state.navier.y;
      const mag = Math.max(1, Math.hypot(dx, dy)), fm = Math.max(1, Math.hypot(flow.x, flow.y));
      const withFlow = (dx * flow.x + dy * flow.y) / mag / fm;
      const response = (state.pageNo === 0 ? 5.8 : state.pageNo === 1 ? 3.7 : 2.6) * (.56 + Math.max(-.25, withFlow) * .45);
      state.navier.vx += dx * response * dt; state.navier.vy += dy * response * dt;
    } else {
      state.navier.vx += (state.w * .66 - state.navier.x) * .035 * dt;
      state.navier.vy += (state.h * .58 - state.navier.y) * .025 * dt;
    }
    state.navier.vx += flow.x * dt; state.navier.vy += flow.y * dt;

    const separation = distance(state.navier, state.stokes);
    if (state.stokesAwake && separation > state.w * .29) {
      const pull = unit(state.stokes.x - state.navier.x, state.stokes.y - state.navier.y);
      const tension = (separation - state.w * .25) * 5.2;
      state.navier.vx += pull.x * tension * dt; state.navier.vy += pull.y * tension * dt;
    }

    integrate(state.navier, dt, state.pageNo === 0 ? .025 : state.pageNo === 1 ? .07 : .12);
    const obs = obstacles(now); collide(state.navier, obs, .16); contain(state.navier);

    const moved = distance(state.navier, centerOf(sourceNavier));
    if (!state.stokesAwake && (moved > state.w * .16 || (now - state.born) > 6500)) wakeStokes();

    state.trail.unshift({ x: state.navier.x, y: state.navier.y });
    if (state.trail.length > 170) state.trail.pop();

    if (state.stokesAwake) {
      const target = state.trail[Math.min(48 + state.pageNo * 12, state.trail.length - 1)];
      const sf = currentAt(state.stokes.x, state.stokes.y, now);
      state.stokes.vx += (target.x - state.stokes.x) * (1.75 - state.pageNo * .27) * dt + sf.x * .22 * dt;
      state.stokes.vy += (target.y - state.stokes.y) * (1.75 - state.pageNo * .27) * dt + sf.y * .22 * dt;
      integrate(state.stokes, dt, .16 + state.pageNo * .09); collide(state.stokes, obs, .055); contain(state.stokes);
    }

    state.journey += dt * (state.pointerDown ? 1.18 : .52);
    if (state.journey > 13 && state.pageNo === 0) turnPage(1);
    if (state.journey > 28 && state.pageNo === 1) turnPage(2);
    if (state.journey > 45 && state.pageNo === 2) beginFinal(now);
  }

  function turnPage(next) {
    if (state.turning) return;
    state.turning = true; page.classList.add("turning"); leaf.classList.remove("turn"); void leaf.offsetWidth; leaf.classList.add("turn");
    setTimeout(() => {
      state.pageNo = next; renderPage(next);
      state.navier.x = state.w * .24; state.navier.y = state.h * .27;
      state.stokes.x = state.w * .16; state.stokes.y = state.h * .34;
      state.trail = Array.from({ length: 170 }, () => ({ x: state.navier.x, y: state.navier.y }));
    }, 610);
    setTimeout(() => { page.classList.remove("turning"); state.turning = false; }, 1370);
  }

  function renderPage(index) {
    const p = pages[index]; folio.textContent = p.folio;
    const split = Math.ceil(p.paragraphs.length / 2);
    print.innerHTML = `<h1>${p.title}</h1><div class="columns">${p.paragraphs.map((v,i) => `<p>${v}</p>${i === split - 1 ? '<p>∂<sub>t</sub>v + (v·∇)v = −ρ⁻¹∇p + ν∇²v + F</p>' : ''}`).join("")}</div><footer>Elements of Fluid Dynamics · §7 · continued</footer>`;
  }

  function beginFinal(now) {
    state.phase = "final"; state.finalAt = now; state.theta = Math.atan2(state.navier.y - state.h * .46, state.navier.x - state.w * .5);
    light.classList.add("show"); print.style.opacity = ".34";
  }

  function updateFinal(dt, now) {
    const cx = state.w * .5, cy = state.h * .46, elapsed = (now - state.finalAt) / 1000;
    let impulse = 0;
    if (state.pointerDown) {
      const angle = Math.atan2(state.pointer.y - cy, state.pointer.x - cx);
      let d = angle - state.theta; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      impulse = Math.max(0, d) * 1.7;
    }
    state.theta += dt * (.58 + impulse);
    const radius = Math.max(3, Math.min(state.w, state.h) * (.35 - Math.min(.33, elapsed * .021)));
    state.navier.x = cx + Math.cos(state.theta) * radius; state.navier.y = cy + Math.sin(state.theta) * radius * .7;
    state.stokes.x = cx + Math.cos(state.theta - .42) * (radius + 7); state.stokes.y = cy + Math.sin(state.theta - .42) * (radius + 7) * .7;
    state.navier.r = .025; state.stokes.r = -.02;
    if (elapsed > 11 && !state.released) release();
  }

  function release() {
    state.released = true; book.classList.add("release");
    navierEl.style.transition = "opacity 2.2s ease, filter 2.2s ease";
    stokesEl.style.transition = "opacity 2.2s ease, filter 2.2s ease";
    navierEl.style.opacity = "0"; stokesEl.style.opacity = "0";
    light.style.transition = "opacity 2.8s ease, transform 2.8s ease";
    light.style.transform = "translate(-50%,-50%) scale(16)";
    setTimeout(() => { state.phase = "ended"; epilogue.classList.add("show"); }, 3000);
  }

  function integrate(body, dt, viscosity) {
    const d = Math.pow(viscosity, dt); body.vx *= d; body.vy *= d;
    body.x += body.vx * dt; body.y += body.vy * dt;
    body.r = Math.atan2(body.vy, body.vx) * .018;
  }

  function contain(body) {
    body.x = Math.max(13, Math.min(state.w - 13, body.x));
    body.y = Math.max(36, Math.min(state.h - 18, body.y));
  }

  function unit(x, y) { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d }; }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function position(el, body) {
    el.style.left = `${body.x}px`; el.style.top = `${body.y}px`;
    el.style.transform = `translate(-50%,-50%) rotate(${body.r || 0}rad)`;
  }

  function draw(now) {
    ctx.clearRect(0, 0, state.w, state.h);
    if (state.phase === "still" || state.phase === "notice") return;
    ctx.save(); ctx.textBaseline = "top";
    const obs = obstacles(now);
    for (const o of obs) {
      const final = state.phase === "final";
      let x = o.x, y = o.y, size = o.size;
      if (final) {
        const elapsed = (now - state.finalAt) / 1000;
        const dx = x - state.w * .5, dy = y - state.h * .46;
        const a = elapsed * .16 + (o.seed % 17) * .02, c = Math.cos(a), s = Math.sin(a);
        x = state.w * .5 + dx * c - dy * s; y = state.h * .46 + dx * s + dy * c;
        size *= .8 + (o.seed % 9) * .08;
      }
      ctx.font = `${size}px "Noto Serif Math", "Times New Roman", serif`;
      ctx.fillStyle = `rgba(38,33,25,${final ? .25 + (o.seed % 5) * .07 : .2 + state.pageNo * .07})`;
      ctx.fillText(o.label, x, y, o.w);
    }
    if (state.stokesAwake && state.trail.length > 5) {
      ctx.beginPath(); ctx.moveTo(state.trail[0].x, state.trail[0].y);
      state.trail.slice(1, 74).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = "rgba(40,34,25,.08)"; ctx.lineWidth = .7; ctx.stroke();
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(.034, (now - state.last) / 1000 || .016); state.last = now;
    if (state.phase === "travel" && !state.turning) updateTravel(dt, now);
    if (state.phase === "final") updateFinal(dt, now);
    if (state.phase !== "ended") {
      position(navierEl, state.navier);
      if (state.stokesAwake || state.phase === "still") position(stokesEl, state.stokes);
      draw(now);
    }
    requestAnimationFrame(frame);
  }

  page.addEventListener("pointerdown", startPointer);
  page.addEventListener("pointermove", e => { if (state.pointerDown) state.pointer = localPoint(e); });
  page.addEventListener("pointerup", endPointer);
  page.addEventListener("pointercancel", endPointer);
  document.querySelector("#retry").addEventListener("click", () => location.reload());
  addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
  setTimeout(notice, 2100);
})();

