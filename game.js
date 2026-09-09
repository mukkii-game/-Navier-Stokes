(() => {
  "use strict";

  const paper = document.querySelector(".paper");
  const playfield = document.querySelector("#playfield");
  const canvas = document.querySelector("#flow");
  const ctx = canvas.getContext("2d");
  const navierEl = document.querySelector("#navier");
  const stokesEl = document.querySelector("#stokes");
  const goalEl = document.querySelector("#goal");
  const hud = document.querySelector("#hud");
  const stageText = document.querySelector("#stageText");
  const bondText = document.querySelector("#bondText");
  const bondMeter = document.querySelector("#bondMeter");
  const marginNote = document.querySelector("#marginNote");
  const chapterCard = document.querySelector("#chapterCard");
  const instruction = document.querySelector("#instruction");
  const instructionText = document.querySelector("#instructionText");
  const prologue = document.querySelector("#prologue");
  const epilogue = document.querySelector("#ending") || document.querySelector("#epilogue");
  const soundButton = document.querySelector("#soundButton");

  const stages = [
    {
      title: "記録 1　移流項",
      copy: "流れと同じ向きへ指を動かす。逆らうと、紙の中でも進みにくい。",
      goal: [.82, .34],
      flow: [.92, -.38],
      viscosity: .28,
      note: "矢印に沿うと速い"
    },
    {
      title: "記録 2　粘性項",
      copy: "ストークスは粘って遅れる。線が赤くなる前に、少し待って連れていく。",
      goal: [.18, .72],
      flow: [-.86, .51],
      viscosity: .76,
      note: "置いていかない"
    },
    {
      title: "記録 3　非線形",
      copy: "二人を中央へ。＝のまわりを、流れと同じ向きにぐるぐるなぞる。",
      goal: [.52, .52],
      flow: [0, 0],
      viscosity: .46,
      note: "渦を完成させる"
    }
  ];

  const state = {
    mode: "intro",
    w: 0,
    h: 0,
    dpr: 1,
    stage: 0,
    stageStarted: 0,
    now: performance.now(),
    last: performance.now(),
    hiddenAt: null,
    pointerDown: false,
    pointer: { x: 0, y: 0 },
    prevPointer: { x: 0, y: 0 },
    navier: { x: 0, y: 0, vx: 0, vy: 0, angle: 0 },
    stokes: { x: 0, y: 0, vx: 0, vy: 0, angle: 0 },
    trail: [],
    vortex: 0,
    vortexAngle: null,
    blowupStarted: 0,
    sound: true,
    audio: null,
    noteTimer: 0,
    chapterTimer: 0
  };

  function resize() {
    const rect = playfield.getBoundingClientRect();
    state.w = rect.width;
    state.h = rect.height;
    state.dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(state.w * state.dpr);
    canvas.height = Math.round(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    placeGoal();
  }

  function localPoint(event) {
    const rect = playfield.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    };
  }

  function begin() {
    ensureAudio();
    prologue.classList.remove("is-active");
    paper.classList.add("awake");
    hud.hidden = false;
    instruction.classList.add("show");
    state.mode = "play";
    state.stage = 0;
    state.vortex = 0;
    const now = performance.now();
    state.stageStarted = now;
    state.last = now;
    state.navier = { x: state.w * .18, y: state.h * .66, vx: 0, vy: 0, angle: 0 };
    state.stokes = { x: state.w * .08, y: state.h * .73, vx: 0, vy: 0, angle: 0 };
    state.pointer = { x: state.navier.x, y: state.navier.y };
    state.prevPointer = { ...state.pointer };
    state.trail = Array.from({ length: 100 }, () => ({ x: state.navier.x, y: state.navier.y }));
    enterStage(0, true);
    paperTick();
  }

  function enterStage(index, first = false) {
    state.stage = index;
    state.stageStarted = performance.now();
    state.vortexAngle = null;
    state.pointerDown = false;
    const stage = stages[index];
    stageText.textContent = `${index + 1} / 3`;
    instructionText.textContent = stage.copy;
    goalEl.classList.toggle("vortex", index === 2);
    goalEl.querySelector("span").textContent = index === 2 ? "∂" : "＝";
    placeGoal();
    showChapter(`${stage.title}<br><small>${stage.note}</small>`, first ? 2300 : 1900);
    beep(310 + index * 90, .08, "triangle", .035);
  }

  function placeGoal() {
    if (!state.w || !state.h) return;
    const [gx, gy] = stages[state.stage].goal;
    goalEl.style.left = `${gx * 100}%`;
    goalEl.style.top = `${gy * 100}%`;
  }

  function showChapter(html, duration) {
    chapterCard.classList.remove("show");
    chapterCard.innerHTML = html;
    chapterCard.style.setProperty("--chapter-duration", `${duration}ms`);
    void chapterCard.offsetWidth;
    chapterCard.classList.add("show");
    clearTimeout(state.chapterTimer);
    state.chapterTimer = setTimeout(() => chapterCard.classList.remove("show"), duration);
  }

  function showNote(text, duration = 900) {
    marginNote.textContent = text;
    marginNote.classList.add("show");
    clearTimeout(state.noteTimer);
    state.noteTimer = setTimeout(() => marginNote.classList.remove("show"), duration);
  }

  function update(dt, now) {
    if (state.mode === "blowup") {
      updateBlowup(now);
      return;
    }
    if (state.mode !== "play") return;

    const stage = stages[state.stage];
    const age = (now - state.stageStarted) / 1000;
    const goal = { x: stage.goal[0] * state.w, y: stage.goal[1] * state.h };
    let flow = normalized(stage.flow[0], stage.flow[1]);

    if (state.stage === 2) {
      const rx = state.navier.x - goal.x;
      const ry = state.navier.y - goal.y;
      flow = normalized(-ry, rx);
    }

    if (state.pointerDown) {
      const dx = state.pointer.x - state.navier.x;
      const dy = state.pointer.y - state.navier.y;
      const desired = normalized(dx, dy);
      const alignment = desired.x * flow.x + desired.y * flow.y;
      const currentHelp = state.stage === 2 ? Math.max(.12, (alignment + 1) * .5) : .23 + Math.max(0, alignment) * .92;
      const stiffness = 10.5 * currentHelp;
      state.navier.vx += dx * stiffness * dt;
      state.navier.vy += dy * stiffness * dt;

      if (alignment < -.25 && Math.hypot(dx, dy) > 24) showNote("流れに逆らっている");
    }

    const drift = state.stage === 2 ? 8 : 23;
    state.navier.vx += flow.x * drift * dt;
    state.navier.vy += flow.y * drift * dt;
    const nDamping = Math.pow(.002, dt);
    state.navier.vx *= nDamping;
    state.navier.vy *= nDamping;

    const separation = distance(state.navier, state.stokes);
    const maxDistance = state.stage === 1 ? Math.min(150, state.w * .34) : Math.min(185, state.w * .42);
    if (separation > maxDistance) {
      const pull = normalized(state.stokes.x - state.navier.x, state.stokes.y - state.navier.y);
      state.navier.vx += pull.x * (separation - maxDistance) * 5.5 * dt;
      state.navier.vy += pull.y * (separation - maxDistance) * 5.5 * dt;
      navierEl.classList.add("waiting");
      showNote("待って。ストークスが粘ってる");
    } else {
      navierEl.classList.remove("waiting");
    }

    state.navier.x += state.navier.vx * dt;
    state.navier.y += state.navier.vy * dt;
    clampCharacter(state.navier);

    state.trail.unshift({ x: state.navier.x, y: state.navier.y });
    if (state.trail.length > 140) state.trail.pop();
    const lag = state.stage === 1 ? 42 : state.stage === 2 ? 27 : 18;
    const follow = state.trail[Math.min(lag, state.trail.length - 1)];
    const followPower = 7.2 - stage.viscosity * 4.8;
    state.stokes.vx += (follow.x - state.stokes.x) * followPower * dt;
    state.stokes.vy += (follow.y - state.stokes.y) * followPower * dt;
    state.stokes.vx += flow.x * drift * (1 - stage.viscosity) * dt;
    state.stokes.vy += flow.y * drift * (1 - stage.viscosity) * dt;
    const sDamping = Math.pow(.012 + stage.viscosity * .02, dt);
    state.stokes.vx *= sDamping;
    state.stokes.vy *= sDamping;
    state.stokes.x += state.stokes.vx * dt;
    state.stokes.y += state.stokes.vy * dt;
    clampCharacter(state.stokes);

    if (age > 14 && state.stage < 2) {
      const assist = Math.min(.8, (age - 14) * .08);
      state.navier.x += (goal.x - state.navier.x) * assist * dt;
      state.navier.y += (goal.y - state.navier.y) * assist * dt;
      state.stokes.x += (goal.x - state.stokes.x) * assist * .75 * dt;
      state.stokes.y += (goal.y - state.stokes.y) * assist * .75 * dt;
    }

    updateBond(maxDistance);

    if (state.stage < 2) {
      const reached = distance(state.navier, goal) < 72 && distance(state.stokes, goal) < 82;
      if (reached) enterStage(state.stage + 1);
    } else {
      updateVortex(goal, dt, age);
    }
  }

  function updateVortex(center, dt, age) {
    const near = distance(state.navier, center) < Math.min(state.w, state.h) * .34;
    if (state.pointerDown && near) {
      const angle = Math.atan2(state.pointer.y - center.y, state.pointer.x - center.x);
      if (state.vortexAngle !== null) {
        let diff = angle - state.vortexAngle;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        if (diff > 0) state.vortex += diff * 100 / (Math.PI * 2 * 1.45);
        else if (diff < -.025) showNote("矢印と同じ向きへ");
      }
      state.vortexAngle = angle;
    } else {
      state.vortexAngle = null;
    }

    if (age > 16) state.vortex += dt * 11;
    state.vortex = Math.min(100, state.vortex);
    stageText.textContent = `${Math.round(state.vortex)}%`;
    bondText.textContent = state.vortex < 100 ? "渦を記述中" : "特異点";
    bondMeter.style.width = `${Math.max(8, state.vortex)}%`;
    bondMeter.style.backgroundColor = state.vortex > 75 ? "var(--red)" : "var(--blue)";
    if (state.vortex >= 100) beginBlowup();
  }

  function updateBond(maxDistance) {
    if (state.stage === 2) return;
    const d = distance(state.navier, state.stokes);
    const ratio = Math.min(100, d / maxDistance * 100);
    bondMeter.style.width = `${Math.max(7, ratio)}%`;
    if (ratio < 42) {
      bondText.textContent = "近い";
      bondMeter.style.backgroundColor = "var(--blue)";
    } else if (ratio < 78) {
      bondText.textContent = "ちょうどいい";
      bondMeter.style.backgroundColor = "var(--blue)";
    } else {
      bondText.textContent = "離れすぎ";
      bondMeter.style.backgroundColor = "var(--red)";
    }
  }

  function beginBlowup() {
    state.mode = "blowup";
    state.blowupStarted = performance.now();
    state.pointerDown = false;
    instruction.classList.remove("show");
    showChapter("有限時間で<br><strong>速度が発散する</strong>", 1900);
    sweepSound();
  }

  function updateBlowup(now) {
    const p = Math.min(1, (now - state.blowupStarted) / 2300);
    const center = { x: state.w * .52, y: state.h * .52 };
    const ease = 1 - Math.pow(1 - p, 3);
    const turns = ease * Math.PI * 7;
    const radius = (1 - ease) * Math.min(state.w, state.h) * .23 + 3;
    state.navier.x = center.x + Math.cos(turns) * radius;
    state.navier.y = center.y + Math.sin(turns) * radius * .62;
    state.stokes.x = center.x + Math.cos(turns + Math.PI) * radius * .82;
    state.stokes.y = center.y + Math.sin(turns + Math.PI) * radius * .52;
    state.navier.angle = turns + Math.PI / 2;
    state.stokes.angle = turns + Math.PI / 2;
    if (p >= 1) finish();
  }

  function finish() {
    if (state.mode === "ending") return;
    state.mode = "ending";
    hud.hidden = true;
    goalEl.hidden = true;
    navierEl.hidden = true;
    stokesEl.hidden = true;
    epilogue.classList.add("is-active");
    endingChime();
  }

  function restart() {
    epilogue.classList.remove("is-active");
    goalEl.hidden = false;
    navierEl.hidden = false;
    stokesEl.hidden = false;
    begin();
  }

  function clampCharacter(c) {
    c.x = Math.max(54, Math.min(state.w - 54, c.x));
    c.y = Math.max(70, Math.min(state.h - 54, c.y));
    c.angle = Math.max(-.2, Math.min(.2, c.vx * .00045));
  }

  function draw(now) {
    ctx.clearRect(0, 0, state.w, state.h);
    if (state.mode === "intro" || state.mode === "ending") return;
    const stage = stages[state.stage];
    const center = { x: stage.goal[0] * state.w, y: stage.goal[1] * state.h };

    if (state.stage < 2) drawParallelFlow(stage.flow);
    else drawSpiralFlow(center, now);
    drawTrail();
    drawBond();

    if (state.mode === "blowup") {
      const p = Math.min(1, (now - state.blowupStarted) / 2300);
      ctx.save();
      ctx.globalAlpha = Math.max(0, (p - .55) * 2.2);
      ctx.fillStyle = "#282720";
      ctx.font = `${52 + p * 45}px "Noto Serif Math", serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("∞", center.x, center.y);
      ctx.restore();
    }
  }

  function drawParallelFlow(vector) {
    const f = normalized(vector[0], vector[1]);
    const perp = { x: -f.y, y: f.x };
    const length = Math.hypot(state.w, state.h) * 1.3;
    ctx.save();
    ctx.strokeStyle = "rgba(56, 72, 75, .22)";
    ctx.fillStyle = "rgba(56, 72, 75, .31)";
    ctx.lineWidth = 1;
    for (let i = -4; i <= 5; i++) {
      const ox = state.w * .5 + perp.x * i * 54;
      const oy = state.h * .52 + perp.y * i * 54;
      ctx.beginPath();
      ctx.moveTo(ox - f.x * length, oy - f.y * length);
      ctx.quadraticCurveTo(ox + perp.x * 9, oy + perp.y * 9, ox + f.x * length, oy + f.y * length);
      ctx.stroke();
      drawArrow(ox + f.x * 18, oy + f.y * 18, Math.atan2(f.y, f.x));
    }
    ctx.restore();
  }

  function drawSpiralFlow(center, now) {
    ctx.save();
    ctx.strokeStyle = "rgba(120, 55, 45, .25)";
    ctx.fillStyle = "rgba(120, 55, 45, .35)";
    ctx.lineWidth = 1.1;
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (let i = 0; i < 100; i++) {
        const a = i * .095 + arm * Math.PI * 2 / 3 + now * .00004;
        const r = 7 + i * 1.38;
        const x = center.x + Math.cos(a) * r;
        const y = center.y + Math.sin(a) * r * .62;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    drawArrow(center.x + 80, center.y + 2, Math.PI / 2);
    ctx.restore();
  }

  function drawArrow(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-2, -4);
    ctx.lineTo(0, 0);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawTrail() {
    if (state.trail.length < 2) return;
    ctx.save();
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = "rgba(126, 58, 47, .22)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    state.trail.slice(0, 70).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
  }

  function drawBond() {
    const d = distance(state.navier, state.stokes);
    const max = state.stage === 1 ? Math.min(150, state.w * .34) : Math.min(185, state.w * .42);
    ctx.save();
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = d > max * .78 ? "rgba(154, 63, 53, .72)" : "rgba(51, 77, 91, .42)";
    ctx.lineWidth = d > max * .78 ? 1.7 : 1;
    ctx.beginPath();
    ctx.moveTo(state.navier.x, state.navier.y);
    ctx.quadraticCurveTo((state.navier.x + state.stokes.x) / 2, (state.navier.y + state.stokes.y) / 2 + 12, state.stokes.x, state.stokes.y);
    ctx.stroke();
    ctx.restore();
  }

  function renderCharacters(now) {
    if (state.mode === "intro" || state.mode === "ending") return;
    const bob = Math.sin(now * .006) * 1.5;
    const scale = state.mode === "blowup" ? Math.max(.15, 1 - (now - state.blowupStarted) / 2700) : 1;
    navierEl.style.transform = `translate(${state.navier.x}px, ${state.navier.y + bob}px) translate(-50%, -50%) rotate(${state.navier.angle}rad) scale(${scale})`;
    stokesEl.style.transform = `translate(${state.stokes.x}px, ${state.stokes.y - bob}px) translate(-50%, -50%) rotate(${state.stokes.angle}rad) scale(${scale})`;
  }

  function loop(now) {
    const dt = Math.min(.033, Math.max(0, (now - state.last) / 1000));
    state.last = now;
    state.now = now;
    update(dt, now);
    draw(now);
    renderCharacters(now);
    requestAnimationFrame(loop);
  }

  function normalized(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function ensureAudio() {
    if (!state.sound) return;
    try {
      if (!state.audio) state.audio = new (window.AudioContext || window.webkitAudioContext)();
      if (state.audio.state === "suspended") state.audio.resume();
    } catch (_) { /* Audio is optional. */ }
  }

  function beep(frequency, duration, type = "sine", volume = .025) {
    if (!state.sound) return;
    try {
      ensureAudio();
      const osc = state.audio.createOscillator();
      const gain = state.audio.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, state.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, state.audio.currentTime + duration);
      osc.connect(gain).connect(state.audio.destination);
      osc.start();
      osc.stop(state.audio.currentTime + duration);
    } catch (_) { /* Audio is optional. */ }
  }

  function paperTick() {
    beep(235, .028, "square", .012);
    setTimeout(() => beep(275, .025, "square", .01), 115);
  }

  function sweepSound() {
    if (!state.sound) return;
    try {
      ensureAudio();
      const osc = state.audio.createOscillator();
      const gain = state.audio.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(110, state.audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(980, state.audio.currentTime + 1.65);
      gain.gain.setValueAtTime(.032, state.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, state.audio.currentTime + 1.8);
      osc.connect(gain).connect(state.audio.destination);
      osc.start();
      osc.stop(state.audio.currentTime + 1.8);
    } catch (_) { /* Audio is optional. */ }
  }

  function endingChime() {
    [196, 294, 392].forEach((f, i) => setTimeout(() => beep(f, .32, "sine", .024), i * 145));
  }

  document.querySelector("#startButton").addEventListener("click", begin);
  document.querySelector("#retryButton").addEventListener("click", restart);
  soundButton.addEventListener("click", () => {
    state.sound = !state.sound;
    soundButton.textContent = state.sound ? "音　ON" : "音　OFF";
    soundButton.setAttribute("aria-label", state.sound ? "音を切る" : "音を出す");
    if (state.sound) paperTick();
  });

  playfield.addEventListener("pointerdown", event => {
    if (state.mode !== "play") return;
    state.pointerDown = true;
    state.pointer = localPoint(event);
    state.prevPointer = { ...state.pointer };
    playfield.setPointerCapture?.(event.pointerId);
    beep(175 + state.stage * 35, .035, "triangle", .012);
  });
  playfield.addEventListener("pointermove", event => {
    if (!state.pointerDown || state.mode !== "play") return;
    state.prevPointer = { ...state.pointer };
    state.pointer = localPoint(event);
  });
  playfield.addEventListener("pointerup", () => { state.pointerDown = false; });
  playfield.addEventListener("pointercancel", () => { state.pointerDown = false; });

  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) state.hiddenAt = performance.now();
    else if (state.hiddenAt !== null) {
      const paused = performance.now() - state.hiddenAt;
      state.stageStarted += paused;
      if (state.mode === "blowup") state.blowupStarted += paused;
      state.hiddenAt = null;
      state.last = performance.now();
    }
  });

  resize();
  requestAnimationFrame(loop);
})();
