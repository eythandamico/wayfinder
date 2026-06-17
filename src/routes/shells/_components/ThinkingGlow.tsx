"use client";

import { useEffect, useRef } from "react";
import { motion, type MotionStyle, type Transition } from "motion/react";

/**
 * ThinkingGlow — a wavery edge glow that lights up the bottom of the
 * chat panel while the agent is "thinking."
 *
 * Shape: full-width bottom edge plus side rises that climb the lower
 * portion of the panel walls. A tighter rim "outline" overlays the
 * broader halo so the panel reads as outlined in light.
 *
 * Color: brand mint dominant, signal-blue lift at the corners,
 * white sparkle peaks where the noise field crests.
 *
 * Lifecycle: WebGL is initialised once on mount so the first
 * activation paints instantly; the render loop is gated on `active`
 * so we don't burn frames when idle.
 */

const VERT_SHADER = `
  attribute vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAG_SHADER = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  // 0 = both sides rise (default chat-panel look)
  // 1 = right side only (gut-check corner — bottom + right)
  // 2 = left side only
  uniform float u_sideMode;
  // Which edge of the canvas the glow anchors to.
  //   0 = bottom (rise upward)
  //   1 = right  (rise leftward)
  //   2 = top    (rise downward)
  //   3 = left   (rise rightward)
  // The fragment math is written as if the glow always rises from
  // the bottom; we rotate uv→muv at the top of main() so every
  // downstream computation (distances, side rises, noise, color
  // blend) just works in the rotated frame.
  uniform float u_edge;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p *= 2.1;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv.y = 1.0 - uv.y; // y=0 top, y=1 bottom in flipped space

    // Rotate UV so the glow always logically rises from the bottom.
    // After the mapping, muv.y near 1 sits at the anchor edge and
    // muv.y near 0 is the farthest extent of the glow.
    //   bottom: identity
    //   right : 90° CCW — original right edge becomes logical bottom
    //   top   : 180° flip
    //   left  : 90° CW
    vec2 muv;
    if (u_edge < 0.5) {
      muv = uv;
    } else if (u_edge < 1.5) {
      muv = vec2(uv.y, uv.x);
    } else if (u_edge < 2.5) {
      muv = vec2(uv.x, 1.0 - uv.y);
    } else {
      muv = vec2(uv.y, 1.0 - uv.x);
    }

    // Base time multiplier — drives every noise scroll downstream.
    // Pushed to 0.72 for clearly visible drift across the surface.
    // The pool currents and sparkle noise now traverse the glow on
    // the order of a few seconds — reads as alive without tipping
    // into anxious / strobing territory.
    float t = u_time * 0.72;

    // Edge distances (computed in muv frame — "bottom" is the anchor)
    float dBottom = 1.0 - muv.y;
    // sideMode picks which edge(s) contribute to dSide. We use a
    // large fallback distance (effectively no glow) on the silenced
    // side so e.g. the gut-check corner only rises on the right.
    float dRight = 1.0 - muv.x;
    float dLeft  = muv.x;
    float dSide;
    if (u_sideMode < 0.5) {
      dSide = min(dLeft, dRight);
    } else if (u_sideMode < 1.5) {
      dSide = dRight;
    } else {
      dSide = dLeft;
    }

    // Side rises start ~18% into the canvas — gives a tall climb.
    float sideMask = smoothstep(0.18, 1.0, muv.y);

    // Horizontal taper for the bottom glow when we're in a
    // single-side (L-shape) mode. In "both" mode the bottom edge
    // runs the full width; in right/left mode it fades toward the
    // far edge so the bottom-edge end shrinks the same way the
    // side rise tapers at the top. Mirror image of sideMask in
    // intent, applied along muv.x instead of muv.y.
    float bottomMask = 1.0;
    if (u_sideMode > 0.5 && u_sideMode < 1.5) {
      // right-side L — fade bottom toward the left
      bottomMask = smoothstep(0.0, 0.65, muv.x);
    } else if (u_sideMode > 1.5) {
      // left-side L — fade bottom toward the right
      bottomMask = smoothstep(1.0, 0.35, muv.x);
    }

    // Broad halo — combined with an L2 (euclidean) norm so the
    // bottom + side contributions blend smoothly at the corners
    // instead of meeting in a hard 90° L. Clamped so the corner
    // doesn't over-bright when both terms hit 1.0.
    float glowBottom = exp(-dBottom * 5.2) * bottomMask;
    float glowSide   = exp(-dSide * 9.0) * sideMask;
    float glow = min(sqrt(glowBottom * glowBottom + glowSide * glowSide), 1.0);

    // Tight rim outline — same L2-norm trick so the rim follows
    // a rounded path through the corner.
    float rimBottom = exp(-dBottom * 20.0) * bottomMask;
    float rimSide   = exp(-dSide * 24.0) * sideMask;
    float rim = min(sqrt(rimBottom * rimBottom + rimSide * rimSide), 1.0);

    float edge = max(glow, rim * 1.10);

    // Wave modulation — strong near edges, calm in the interior.
    // Noise sampled in muv frame so wave direction follows the
    // anchor edge (waves run along the bottom for edge=bottom, up
    // the right wall for edge=right, etc.).
    vec2 nUv = muv * vec2(5.0, 3.2);
    float n1 = fbm(nUv + vec2(t * 0.9, t * 0.5));
    float n2 = fbm(nUv * 1.4 - vec2(t * 0.4, t * 0.7));
    float n = clamp(n1 * 0.65 + n2 * 0.45, 0.0, 1.0);
    // Wave amplitude widened so crests pop brighter and troughs
    // dim further — gives the glow visible undulation rather than
    // a fairly flat shimmer.
    float wave = mix(0.78, 1.0, edge) * (0.45 + n * 1.05);

    // Color blend. Blue stays clearly blue so the center pool keeps
    // its identity — the green presence comes from motion-driven
    // pulses below, not from washing the static color.
    vec3 green = vec3(0.42, 0.96, 0.62);
    vec3 blue  = vec3(0.30, 0.78, 0.98);
    vec3 white = vec3(1.0);

    // Sides + corners — full brand green.
    float sideWeight = clamp(max(rimSide, glowSide), 0.0, 1.0);
    vec3 color = mix(blue, green, sideWeight);

    // Central pool mask — strongest at the bottom-center where the
    // bottom edge contributes but the side edges don't. Used to
    // drive green pulses + white peaks that ripple through the pool.
    float poolMask = (1.0 - sideWeight) * smoothstep(0.05, 0.45, glowBottom);

    // A second, slower noise field — gives the pool its own current,
    // independent of the fine-grain sparkle noise. Larger scale so
    // the eye reads it as long flowing patches.
    float poolNoise = fbm(muv * vec2(2.6, 1.8) + vec2(t * 0.45, t * 0.55));

    // Green pulses — patches of brighter green ripple through the
    // pool when the pool noise crests.
    color = mix(color, green, poolNoise * poolMask * 0.45);

    // White highlight peaks in the pool — taller crests reach white.
    // Slightly stronger crests so the flowing pool currents read.
    float poolHighlight = smoothstep(0.72, 0.93, poolNoise);
    color = mix(color, white, poolHighlight * poolMask * 0.62);

    // Edge sparkle from the original noise — twinkles fire more
    // often now (lower threshold) so the corners visibly flicker
    // as the noise field drifts through.
    float sparkle = smoothstep(0.70, 0.93, n1);
    color = mix(color, white, sparkle * 0.55);

    // Breath pulse — deeper amplitude + faster cycle (~4s) so the
    // inhale/exhale reads as clear life. Modulates intensity
    // between ~0.62 and ~1.00. Combined with the doubled wave
    // amplitude above, the surface has both fast micro-motion
    // (noise scroll) and slow macro-motion (breath).
    float breath = 0.81 + 0.19 * sin(u_time * 1.55);

    // Pre-subdue intensity — the original "edge band is
    // unambiguously visible" pass before the softening iterations.
    float intensity = edge * wave * 1.35 * breath;
    intensity = pow(min(intensity, 1.6), 0.85);

    gl_FragColor = vec4(color * intensity, intensity);
  }
`;

export type ThinkingGlowEdge = "bottom" | "right" | "top" | "left";

export function ThinkingGlow({
  active,
  edge = "bottom",
  heightClass = "h-[58%]",
  widthClass = "w-[58%]",
  sides = "both",
}: {
  active: boolean;
  /** Which edge of the parent the glow anchors to + rises away
   *  from. `bottom` is the chat-panel default; `right` puts the
   *  pool on the right wall and the corner rises top/bottom — use
   *  this for list-row affordances where the agent button reveals
   *  on the right. Pick the anchor that matches what the parent
   *  surface is "leaning on". */
  edge?: ThinkingGlowEdge;
  /** For edge=bottom/top: glow's share of the parent's height.
   *  Default 58% matches the chat composer; pass `h-full` for
   *  inline halos that should fill their wrapper. */
  heightClass?: string;
  /** For edge=right/left: glow's share of the parent's width.
   *  Mirrors heightClass for the horizontal anchors. */
  widthClass?: string;
  /** Which "side" rises join the primary edge.
   *    edge=bottom → left/right walls climb up
   *    edge=right  → top/bottom walls climb across
   *    edge=top    → left/right walls drop down
   *    edge=left   → top/bottom walls climb across
   *  `both` gives a U-shape; `right`/`left` give an L hugging one
   *  corner. The choice is interpreted in the rotated frame, so
   *  with edge=right + sides=right you get an L hugging the
   *  bottom-right corner. */
  sides?: "both" | "right" | "left";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const drawRef = useRef<((now: number) => void) | null>(null);
  const sideMode = sides === "right" ? 1 : sides === "left" ? 2 : 0;
  const edgeMode =
    edge === "right" ? 1 : edge === "top" ? 2 : edge === "left" ? 3 : 0;
  // Refs let the render loop pick up prop changes without rebuilding
  // the WebGL context. In practice edge + sides are stable per mount
  // for current callers, but this keeps the door open to runtime flips
  // (e.g. a panel that re-anchors its glow when docked).
  const sideModeRef = useRef(sideMode);
  const edgeModeRef = useRef(edgeMode);
  sideModeRef.current = sideMode;
  edgeModeRef.current = edgeMode;

  // One-time WebGL initialisation. The draw function is held in a ref
  // so the activation effect can start/stop the rAF loop without
  // tearing down and rebuilding the GL context.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Hide the canvas until WebGL has been confirmed alive AND the
    // framebuffer explicitly cleared. The spec says new contexts
    // start at (0,0,0,0) transparent, but several Chromium/Safari
    // driver combos serve uninitialised GPU memory (opaque white)
    // until the first `gl.clear()` lands. That used to surface here
    // as a "white box for the ThinkingGlow" during the activation
    // animation — the motion.div would tween opacity in before the
    // rAF loop's first draw cleared the buffer. Starting hidden +
    // explicitly flipping visible only after a clear closes the race.
    canvas.style.opacity = "0";

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: false,
      alpha: true,
      antialias: false,
    });
    if (!gl) {
      // Context creation fails when the browser hits its simultaneous-
      // context limit (~16). Canvas stays opacity:0 — better than a
      // white rectangle.
      return;
    }

    // GPU can reclaim our context (page backgrounded too long, too
    // many WebGL canvases on the page, GPU reset). Hide on loss so we
    // don't flash stale or driver-default buffer content. We don't
    // currently restore — the parent will typically remount the glow
    // when the next interaction fires.
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      canvas.style.opacity = "0";
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderScale = 0.5; // half-res; perceptually identical with blur
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * renderScale;

    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
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
    const sideLoc = gl.getUniformLocation(program, "u_sideMode");
    const edgeLoc = gl.getUniformLocation(program, "u_edge");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Prime the framebuffer to a known transparent state before the
    // canvas becomes visible. From here on the active-gated rAF loop
    // owns clearing every frame, but this is the one clear that has
    // to happen REGARDLESS of `active` so an active=false→true
    // transition doesn't briefly reveal uninitialised memory.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    canvas.style.opacity = "1";

    const start = performance.now();
    const TARGET_FPS = 30;
    const FRAME_MS = 1000 / TARGET_FPS;
    let lastDraw = 0;

    drawRef.current = (now: number) => {
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      const t = (now - start) / 1000;
      gl.uniform1f(timeLoc, reduce ? 0 : t);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(sideLoc, sideModeRef.current);
      gl.uniform1f(edgeLoc, edgeModeRef.current);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      ro.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      drawRef.current = null;
    };
  }, []);

  // Run the render loop only while active. Setup is already done by
  // the mount effect above, so flipping active=true starts painting
  // on the very next frame — no shader compile or context creation
  // delay on first activation.
  useEffect(() => {
    if (!active) return;
    const tick = (now: number) => {
      drawRef.current?.(now);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active]);

  // Anchor + sizing: the glow occupies a strip along its anchor
  // edge. For horizontal anchors (bottom/top) the strip's depth is
  // controlled by `heightClass`; for vertical anchors (right/left)
  // by `widthClass`. The other axis fills the parent (inset-x-0 or
  // inset-y-0). z-0 puts the glow behind siblings — consumers that
  // need to render above it stay on a positive z.
  const positionClass = (() => {
    switch (edge) {
      case "bottom":
        return `absolute inset-x-0 bottom-0 z-0 ${heightClass} overflow-hidden`;
      case "top":
        return `absolute inset-x-0 top-0 z-0 ${heightClass} overflow-hidden`;
      case "right":
        return `absolute inset-y-0 right-0 z-0 ${widthClass} overflow-hidden`;
      case "left":
        return `absolute inset-y-0 left-0 z-0 ${widthClass} overflow-hidden`;
    }
  })();

  // Grow-in/grow-out animation aligned with the anchor edge.
  // Horizontal anchors scale on Y from a sliver at the anchor edge;
  // vertical anchors scale on X. Origin pins the anchor edge so the
  // glow grows AWAY from the anchor, not toward it.
  const isHoriz = edge === "right" || edge === "left";
  const animate = isHoriz
    ? { opacity: active ? 1 : 0, scaleX: active ? 1 : 0.35 }
    : { opacity: active ? 1 : 0, scaleY: active ? 1 : 0.35 };
  // Grow IN — a slow, settling rise. Spring on the scale gives the
  // leading edge of the glow a soft arrival; eased opacity overlays
  // a brightening wash on top of the rise.
  // Grow OUT — collapse back toward the anchor, slightly faster
  // than the rise so the dismissal feels intentional.
  const scaleInTransition = {
    type: "spring" as const,
    stiffness: 95,
    damping: 22,
    mass: 0.9,
  };
  const scaleOutTransition = {
    duration: 0.42,
    ease: [0.7, 0, 0.84, 0] as [number, number, number, number],
  };
  const transition: Transition = active
    ? {
        ...(isHoriz
          ? { scaleX: scaleInTransition }
          : { scaleY: scaleInTransition }),
        opacity: {
          duration: 0.55,
          ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
        },
      }
    : {
        ...(isHoriz
          ? { scaleX: scaleOutTransition }
          : { scaleY: scaleOutTransition }),
        opacity: {
          duration: 0.32,
          ease: [0.4, 0, 1, 1] as [number, number, number, number],
        },
      };
  const originStyle: MotionStyle = isHoriz
    ? { originX: edge === "right" ? 1 : 0 }
    : { originY: edge === "bottom" ? 1 : 0 };

  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none ${positionClass}`}
      style={originStyle}
      initial={false}
      animate={animate}
      transition={transition}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        // Bumped blur further for a softer, more atmospheric glow
        // now that the corner round-out keeps the shape coherent.
        style={{ filter: "blur(16px)" }}
      />
    </motion.div>
  );
}
