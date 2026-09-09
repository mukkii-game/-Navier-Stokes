(() => {
  "use strict";

  const canvas = document.querySelector("#fluid");
  const ctx = canvas.getContext("2d");
  const intro = document.querySelector("#intro");
  const ending = document.querySelector("#ending");
  const hud = document.querySelector("#hud");
  const timerEl = document.querySelector("#timer");
  const meterEl = document.querySelector("#vortexMeter");
  const vortexText = document.querySelector("#vortexText");
  const storyBeat = document.querySelector("#storyBeat");
  const resultScore = document.querySelector("#resultScore");
  const endingCopy = document.querySelector("#endingCopy");
  const soundButton = document.querySelector("#soundButton");

  const state = {
    mode: "intro",
    width: innerWidth,
    height: innerHeight,
    dpr: 1,
    start: 0,
    last: performance.now(),
    pointerDown: false,
    pointer: { x: innerWidth * .5, y: innerHeight * .62 },
    navier: { x: innerWidth * .43, y: innerHeight * .62, vx: 0, vy: 0 },
    stokes: { x: innerWidth * .58, y: innerHeight * .64, vx: 0, vy: 0 },
    trail: [],
    droplets: [],
    agents: [],
    vortex: 0,
    rawVortex: 0,
    lastAngle: null,
    beat: -1,
    blowup: 0,
    sound: true,
    audio: null
  };

  function resize() {
    state.width = innerWidth;
    state.height = innerHeight;
    state.dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    makeDroplets();
  }

  function makeDroplets() {
    const count = Math.min(130, Math.round(state.width * state.height / 7000));
    state.droplets = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      px: 0,
      py: 0,
      r: 1 + Math.random() * 2.3,
      phase: i * .8 + Math.random() * 5
    }));
  }

  function reset() {
    state.mode = "play";
    state.start = performance.now();
    state.vortex = 0;
    state.rawVortex = 0;
    state.lastAngle = null;
    state.beat = -1;
    state.blowup = 0;
    state.pointerDown = false;
    state.navier = { x: state.width * .38, y: state.height * .62, vx: 0, vy: 0 };
    state.stokes = { x: state.width * .58, y: state.height * .64, vx: 0, vy: 0 };
    state.pointer = { x: state.navier.x, y: state.navier.y };
    state.trail = Array.from({ length: 42 }, () => ({ x: state.navier.x, y: state.navier.y }));
    state.agents = Array.from({ length: Math.min(110, Math.round(state.width / 4)) }, (_, i) => {
      const edge = i % 4;
      return {
        x: edge === 0 ? -30 : edge === 1 ? state.width + 30 : Math.random() * state.width,
        y: edge === 2 ? -30 : edge === 3 ? state.height + 30 : Math.random() * state.height,
        s: .25 + Math.random() * .55,
        phase: Math.random() * Math.PI * 2
      };
    });
    intro.classList.remove("is-active");
    ending.classList.remove("is-active");
    hud.hidden = false;
    beep(420, .08, "sine", .05);
    showBeat("① 10,000のAIエージェントが<br>やってきた！");
  }

  function showBeat(html) {
    storyBeat.classList.remove("show");
    storyBeat.innerHTML = html;
    void storyBeat.offsetWidth;
    storyBeat.classList.add("show");
  }

  function update(dt, now) {
    const t = (now - state.start) / 1000;
    const left = Math.max(0, 8.8 - t);
    timerEl.textContent = left.toFixed(1);

    const beats = [
      [0, "① 10,000のAIエージェントが<br>やってきた！"],
      [2.1, "② ナビエをナビして！<br>ストークスは勝手についてくる"],
      [4.7, "③ ぐるぐる回って<br>流れをややこしくしろ！"],
      [7.0, "④ 粘性より速く——<br>無限へ！"]
    ];
    let nextBeat = 0;
    for (let i = 0; i < beats.length; i++) if (t >= beats[i][0]) nextBeat = i;
    if (nextBeat !== state.beat) {
      state.beat = nextBeat;
      if (nextBeat > 0) showBeat(beats[nextBeat][1]);
    }

    const target = state.pointerDown ? state.pointer : {
      x: state.width * .5 + Math.cos(t * 1.7) * Math.min(85, state.width * .18),
      y: state.height * .61 + Math.sin(t * 1.45) * 45
    };
    const spring = state.pointerDown ? 12 : 2.7;
    state.navier.vx += (target.x - state.navier.x) * spring * dt;
    state.navier.vy += (target.y - state.navier.y) * spring * dt;
    const damping = Math.pow(.0007, dt);
    state.navier.vx *= damping;
    state.navier.vy *= damping;
    state.navier.x += state.navier.vx * dt;
    state.navier.y += state.navier.vy * dt;

    state.navier.x = Math.max(38, Math.min(state.width - 38, state.navier.x));
    state.navier.y = Math.max(100, Math.min(state.height - 42, state.navier.y));

    state.trail.unshift({ x: state.navier.x, y: state.navier.y });
    state.trail.length = Math.min(state.trail.length, 70);
    const follow = state.trail[Math.min(32, state.trail.length - 1)];
    state.stokes.vx += (follow.x - state.stokes.x) * 5.5 * dt;
    state.stokes.vy += (follow.y - state.stokes.y) * 5.5 * dt;
    state.stokes.vx *= Math.pow(.015, dt);
    state.stokes.vy *= Math.pow(.015, dt);
    state.stokes.x += state.stokes.vx * dt;
    state.stokes.y += state.stokes.vy * dt;

    if (state.pointerDown) {
      const cx = state.width * .5;
      const cy = state.height * .58;
      const angle = Math.atan2(state.pointer.y - cy, state.pointer.x - cx);
      if (state.lastAngle !== null) {
        let diff = angle - state.lastAngle;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        state.rawVortex += Math.abs(diff) * 4.2;
      }
      state.lastAngle = angle;
    } else {
      state.lastAngle = null;
    }
    state.vortex = Math.min(100, state.rawVortex + t * 3.4);
    meterEl.style.width = `${state.vortex}%`;
    vortexText.textContent = `${Math.round(state.vortex)}%`;

    const cx = (state.navier.x + state.stokes.x) * .5;
    const cy = (state.navier.y + state.stokes.y) * .5;
    for (const d of state.droplets) {
      const dx = d.x - cx;
      const dy = d.y - cy;
      const dist2 = dx * dx + dy * dy + 800;
      const spin = (35 + state.vortex * 1.5) / dist2;
      d.x += (-dy * spin + Math.sin(t + d.phase) * .05) * dt * 60;
      d.y += (dx * spin - .12) * dt * 60;
      if (d.x < -10) d.x = state.width + 10;
      if (d.x > state.width + 10) d.x = -10;
      if (d.y < -10) d.y = state.height + 10;
      if (d.y > state.height + 10) d.y = -10;
    }

    for (const a of state.agents) {
      const dx = state.stokes.x - a.x;
      const dy = state.stokes.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const swirl = state.vortex / 100;
      a.x += ((dx / len) * a.s * 34 - (dy / len) * swirl * 28) * dt;
      a.y += ((dy / len) * a.s * 34 + (dx / len) * swirl * 28) * dt;
    }

    if (left <= 0) beginBlowup();
  }

  function beginBlowup() {
    if (state.mode !== "play") return;
    state.mode = "blowup";
    state.blowup = performance.now();
    state.pointerDown = false;
    showBeat("特異点、発生！");
    sweepSound();
  }

  function finish() {
    state.mode = "ending";
    hud.hidden = true;
    resultScore.textContent = `${Math.round(state.vortex)}%`;
    endingCopy.textContent = state.vortex >= 75
      ? "あなたの渦で、ふたりは無限に速くなって逃げきった。"
      : "残りの渦は、10,000のAIエージェントが手伝ってくれた。";
    ending.classList.add("is-active");
    beep(523, .12, "triangle", .06);
    setTimeout(() => beep(659, .12, "triangle", .05), 120);
    setTimeout(() => beep(784, .24, "triangle", .05), 240);
  }

  function updateBlowup(now) {
    const p = Math.min(1, (now - state.blowup) / 1450);
    const cx = state.width * .5;
    const cy = state.height * .57;
    for (const d of state.droplets) {
      const dx = d.x - cx;
      const dy = d.y - cy;
      const angle = .11 + p * .2;
      const scale = .985 - p * .005;
      d.x = cx + (dx * Math.cos(angle) - dy * Math.sin(angle)) * scale;
      d.y = cy + (dx * Math.sin(angle) + dy * Math.cos(angle)) * scale;
    }
    state.navier.x += (cx - state.navier.x) * .055;
    state.navier.y += (cy - state.navier.y) * .055;
    state.stokes.x += (cx - state.stokes.x) * .052;
    state.stokes.y += (cy - state.stokes.y) * .052;
    if (p >= 1) finish();
  }

  function draw(now) {
    const w = state.width;
    const h = state.height;
    const t = now / 1000;
    ctx.clearRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(w * .5, h * .58, 5, w * .5, h * .58, Math.max(w, h) * .62);
    glow.addColorStop(0, `rgba(34, 182, 198, ${.09 + state.vortex * .0014})`);
    glow.addColorStop(.42, "rgba(20, 72, 119, .13)");
    glow.addColorStop(1, "rgba(2, 8, 25, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    for (const d of state.droplets) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(116, 231, 225, ${.14 + .12 * Math.sin(t + d.phase)})`;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.mode === "play" || state.mode === "blowup") {
      ctx.save();
      ctx.setLineDash([3, 8]);
      ctx.strokeStyle = "rgba(255, 225, 142, .34)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      state.trail.slice(0, 48).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();

      for (const a of state.agents) {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(t * .4 + a.phase);
        ctx.globalAlpha = .24 + a.s * .35;
        ctx.fillStyle = "#b7c9dc";
        ctx.font = `${10 + a.s * 6}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.fillText("AI", 0, 0);
        ctx.restore();
      }

      drawCharacter(state.stokes, "∇)v", "ストークス", "#60e0d1", -1, t);
      drawCharacter(state.navier, "(v・", "ナビエ", "#ffcb67", 1, t);

      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("AI AGENTS × 10,000", w / 2, h - Math.max(20, parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sab")) || 20));
    }
  }

  function drawCharacter(c, glyph, name, color, tilt, t) {
    ctx.save();
    ctx.translate(c.x, c.y + Math.sin(t * 5 + tilt) * 2);
    const speed = Math.min(1, Math.hypot(c.vx, c.vy) / 600);
    ctx.rotate(tilt * .035 + c.vx * .00015);
    ctx.shadowColor = color;
    ctx.shadowBlur = 16 + speed * 18;
    ctx.fillStyle = "rgba(8, 28, 55, .82)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 45, 37, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = "700 31px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, 0, -2);
    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.fillText(name, 0, 50);
    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min(.033, (now - state.last) / 1000);
    state.last = now;
    if (state.mode === "play") update(dt, now);
    if (state.mode === "blowup") updateBlowup(now);
    draw(now);
    requestAnimationFrame(loop);
  }

  function setPointer(event) {
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
  }

  function ensureAudio() {
    if (!state.audio) state.audio = new (window.AudioContext || window.webkitAudioContext)();
    if (state.audio.state === "suspended") state.audio.resume();
  }

  function beep(frequency, duration, type = "sine", volume = .04) {
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
    } catch (_) { /* Sound is optional. */ }
  }

  function sweepSound() {
    if (!state.sound) return;
    try {
      ensureAudio();
      const osc = state.audio.createOscillator();
      const gain = state.audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, state.audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, state.audio.currentTime + 1.1);
      gain.gain.setValueAtTime(.055, state.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, state.audio.currentTime + 1.2);
      osc.connect(gain).connect(state.audio.destination);
      osc.start();
      osc.stop(state.audio.currentTime + 1.2);
    } catch (_) { /* Sound is optional. */ }
  }

  document.querySelector("#startButton").addEventListener("click", () => {
    ensureAudio();
    reset();
  });
  document.querySelector("#retryButton").addEventListener("click", reset);
  soundButton.addEventListener("click", () => {
    state.sound = !state.sound;
    soundButton.textContent = state.sound ? "♪ ON" : "♪ OFF";
    soundButton.setAttribute("aria-label", state.sound ? "音を切る" : "音を出す");
    if (state.sound) beep(560, .08);
  });

  addEventListener("pointerdown", event => {
    if (state.mode !== "play") return;
    state.pointerDown = true;
    setPointer(event);
    canvas.setPointerCapture?.(event.pointerId);
    beep(260 + state.vortex * 2, .035, "sine", .018);
  });
  addEventListener("pointermove", event => {
    if (!state.pointerDown || state.mode !== "play") return;
    setPointer(event);
  });
  addEventListener("pointerup", () => { state.pointerDown = false; });
  addEventListener("pointercancel", () => { state.pointerDown = false; });
  addEventListener("resize", resize);
  addEventListener("visibilitychange", () => {
    if (document.hidden && state.mode === "play") state.start += performance.now() - state.last;
  });

  resize();
  requestAnimationFrame(loop);
})();
