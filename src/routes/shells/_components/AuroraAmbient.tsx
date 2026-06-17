"use client";

import { useEffect, useRef } from "react";
import { useSignalEvents, useSignals } from "../_state/signals-context";

/**
 * Always-on aurora that lives behind the /shells page. Same noise
 * shader as ThinkingGlow but tuned for an ambient backdrop:
 *
 *   - Slower drift (t * 0.12 vs 0.28) — barely-perceptible motion
 *   - Larger noise cells (1.8 / 1.2 / 0.7 octaves) — bigger blobs
 *   - Vertical falloff so the glow concentrates at the top
 *   - Mild horizontal bias toward center so it pools behind the
 *     command bar rather than spreading edge-to-edge
 *   - Lower base intensity (0.65 + 0.05 baseline vs 1.6 + 0.2)
 *   - DPR capped at 1.5 (vs 2.0) since the heavy CSS blur smooths
 *     out the rasterization anyway
 *
 * Costs one rAF loop per mount, but the shader is tiny
 * (~30 float ops per pixel) so GPU load is negligible on modern
 * hardware. Browser throttles the loop when the tab is hidden.
 */

const VERT_SHADER = `
  attribute vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAG_SHADER = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_flash_color;
  uniform float u_flash_intensity;

  // Sin-free hash (Inigo Quilez style). ~50% cheaper than a trig-based
  // hash on integrated GPUs and visually indistinguishable at the
  // aurora's noise scale.
  float hash(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p.yx + 19.19);
    return fract((p.x + p.y) * p.x);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * 0.12;

    float n1 = noise(uv * 1.8 + vec2(t, t * 0.7));
    float n2 = noise(uv * 1.2 - vec2(t * 0.5, t));
    float n3 = noise(uv * 0.7 + vec2(-t * 0.3, t * 0.4));
    float n = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

    // Warm off-white base — pale cream, directionally neutral so flash
    // signals (mint / tone-down / amber) read as their actual hue.
    // Mixed at 70% of flash intensity so the base never fully washes
    // out under a peak flash.
    vec3 baseColor = vec3(0.90, 0.86, 0.78);
    vec3 color = mix(baseColor, u_flash_color, u_flash_intensity * 0.7);

    // No radial / no top fade — noise drives variation across the full
    // viewport with a small constant base so the entire panel grid
    // sits inside one continuous wash rather than a top-down gradient.
    // Peak intensity tuned lower (0.40 vs the old 0.55) because the
    // aurora is now everywhere, not concentrated in the top arc.
    float boost = 1.0 + u_flash_intensity * 0.5;
    float intensity = clamp(
      smoothstep(0.15, 0.85, n) * 0.32 * boost + 0.08 * boost,
      0.0,
      0.40 + u_flash_intensity * 0.30
    );
    gl_FragColor = vec4(color * intensity, intensity);
  }
`;

/** Single distinct flash color for every signal — soft sky blue,
 *  matched to the --signal token. Low-chroma deliberately so the
 *  flash doesn't shift toward purple under sRGB clamp; pops against
 *  the warm off-white aurora base as its complementary cool. */
const SIGNAL_FLASH_COLOR: [number, number, number] = [0.5, 0.78, 1.0];

type FlashState = {
  startTime: number;
  duration: number;
};

/** Bell-curve interpolator: ramp up over 15% of duration, hold for
 *  40%, ramp down over the remaining 45%. Returns 0..1. */
function flashCurve(progress: number): number {
  if (progress < 0.15) return progress / 0.15;
  if (progress < 0.55) return 1;
  return Math.max(0, (1 - progress) / 0.45);
}

export function AuroraAmbient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const flashRef = useRef<FlashState | null>(null);

  // Cascade tiering: followed-author signals hold their flash 30%
  // longer than the baseline so signals from people you actively
  // care about land with more weight than agent/news fire-hose.
  const { followedAuthorIds } = useSignals();
  useSignalEvents((event) => {
    const followed = followedAuthorIds.has(event.card.author.id);
    flashRef.current = {
      startTime: performance.now(),
      duration: followed ? 2400 : 1800,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // premultipliedAlpha: true so the canvas compositor takes the
    // shader's output as already-premultiplied RGB — required for
    // the fragment to read out as `color * intensity` on-screen
    // instead of `color * intensity⁴` (which is what happens when
    // unmultiplied alpha gets combined with SRC_ALPHA blending and
    // then re-multiplied by the compositor).
    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      alpha: true,
      antialias: false,
    });
    if (!gl) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    /** Half-resolution render — aurora is a low-frequency, heavily
     *  blurred (28px) wash, so quarter-pixel-count work looks identical
     *  on-screen. ~4× cheaper fragment-shader cost. */
    const RENDER_SCALE = 0.5;

    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr * RENDER_SCALE));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr * RENDER_SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const flashColorLoc = gl.getUniformLocation(program, "u_flash_color");
    const flashIntensityLoc = gl.getUniformLocation(
      program,
      "u_flash_intensity",
    );

    // Default flash uniforms match the new warm off-white base so an
    // accidental intensity > 0 with no event in flight produces no
    // visible shift. JS animates these from flashRef inside the
    // render loop when an idea fires.
    gl.uniform3f(flashColorLoc, 0.9, 0.86, 0.78);
    gl.uniform1f(flashIntensityLoc, 0);

    // Premultiplied-alpha blend (Porter-Duff "source over"): src is
    // already (color*alpha, alpha), so factor is 1 for the source
    // and (1 - src.alpha) for the destination.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const start = performance.now();
    /** Throttle to 30fps. Aurora is slow and heavily blurred — full
     *  60/120fps is invisible work. RAF still ticks at display rate but
     *  we skip the draw when we're inside the frame interval. */
    const FRAME_INTERVAL_MS = 1000 / 30;
    let lastFrameAt = 0;

    const render = (now: number) => {
      if (now - lastFrameAt >= FRAME_INTERVAL_MS) {
        lastFrameAt = now;
        const t = (now - start) / 1000;
        gl.uniform1f(timeLoc, reduce ? 0 : t);
        gl.uniform2f(resLoc, canvas.width, canvas.height);

        // Drive flash uniforms from the ref (no React re-renders needed).
        const flash = flashRef.current;
        if (flash) {
          const progress = (now - flash.startTime) / flash.duration;
          if (progress >= 1) {
            flashRef.current = null;
            gl.uniform1f(flashIntensityLoc, 0);
          } else {
            gl.uniform1f(flashIntensityLoc, flashCurve(progress));
            gl.uniform3f(
              flashColorLoc,
              SIGNAL_FLASH_COLOR[0],
              SIGNAL_FLASH_COLOR[1],
              SIGNAL_FLASH_COLOR[2],
            );
          }
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    // Pause the loop when the tab isn't visible so we don't burn GPU
    // (and battery / fan) on a screen the user can't see.
    const onVisibility = () => {
      if (document.hidden) {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      } else if (rafRef.current === null) {
        // Reset throttle anchor so the first wake-up frame fires immediately.
        lastFrameAt = 0;
        rafRef.current = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ filter: "blur(28px)" }}
      />
    </div>
  );
}
