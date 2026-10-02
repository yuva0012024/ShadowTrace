import React, { useEffect, useRef, useState } from 'react';
import shadowAgentCutoutImg from '../assets/images/shadow-agent-cutout.jpg';

export default function LandingCutoutScene() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Smooth Interactive Mouse Parallax
  useEffect(() => {
    if (reducedMotion) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animId;

    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      targetX = (e.clientX - innerWidth / 2) / (innerWidth / 2);
      targetY = (e.clientY - innerHeight / 2) / (innerHeight / 2);
    };

    const updateParallax = () => {
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;

      setParallax({
        x: Math.round(currentX * 100) / 100,
        y: Math.round(currentY * 100) / 100
      });

      animId = requestAnimationFrame(updateParallax);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    animId = requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, [reducedMotion]);

  // Cinematic Floating Gold Dust Particle Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const particleCount = reducedMotion ? 18 : 50;
    const particles = [];
    const colors = [
      'rgba(243, 210, 117, ', // Bright gold
      'rgba(200, 162, 58, ',  // Antique gold
      'rgba(224, 185, 79, ',  // Brass
      'rgba(255, 235, 175, '  // Warm highlight
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.5,
        colorBase: colors[Math.floor(Math.random() * colors.length)],
        baseAlpha: Math.random() * 0.45 + 0.15,
        alpha: 0.25,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: -(Math.random() * 0.4 + 0.12),
        pulseSpeed: Math.random() * 0.025 + 0.008,
        pulseVal: Math.random() * Math.PI
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!reducedMotion) {
          p.x += p.speedX;
          p.y += p.speedY;
          p.pulseVal += p.pulseSpeed;
          p.alpha = p.baseAlpha + Math.sin(p.pulseVal) * 0.15;

          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.colorBase}${Math.max(0.04, p.alpha)})`;
        ctx.shadowColor = '#F3D275';
        ctx.shadowBlur = p.radius > 1.1 ? 5 : 2;
        ctx.fill();

        // Connect nearby telemetry points
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 65) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(200, 162, 58, ${(1 - dist / 65) * 0.09})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  // 3D Parallax Offsets
  const agentTransform = reducedMotion
    ? 'none'
    : `translate3d(${parallax.x * 10}px, ${parallax.y * 7}px, 0)`;

  const globeOverlayTransform = reducedMotion
    ? 'none'
    : `translate3d(${parallax.x * 16}px, ${parallax.y * 12}px, 0)`;

  return (
    <div className="landing-cutout-root" ref={containerRef} aria-hidden="true">
      {/* Background Volumetric Light & Atmospheric Haze */}
      <div className="landing-cutout-ambient-glow" />
      <div className="landing-cutout-core-radiance" />

      {/* Layer 1: Animated Particle Dust Canvas (Background & Foreground depth) */}
      <canvas ref={canvasRef} className="landing-cutout-particle-canvas" />

      {/* Layer 2: Seamless Cutout Subject (Shadow Agent + Golden Globe) */}
      <div
        className="landing-cutout-subject-wrapper"
        style={{ transform: agentTransform }}
      >
        {/* Main Cutout Silhouette - Screen Blended with Seamless Vignetted Mask */}
        <img
          src={shadowAgentCutoutImg}
          alt="ShadowTrace Intelligence Operative with Digital Globe"
          className="landing-cutout-subject-img"
          loading="eager"
        />

        {/* Dynamic Interactive Overlays Anchored on the Golden Globe */}
        <div
          className="landing-cutout-globe-fx-anchor"
          style={{ transform: globeOverlayTransform }}
        >
          {/* Animated 3D Orbital Rings */}
          <div className="cutout-globe-ring cutout-ring-outer" />
          <div className="cutout-globe-ring cutout-ring-mid" />
          <div className="cutout-globe-ring cutout-ring-inner" />

          {/* Orbiting Telemetry Tracer */}
          <div className="cutout-orbital-tracer-track">
            <div className="cutout-orbital-tracer-node" />
          </div>

          {/* Volumetric Globe Core Aura */}
          <div className="cutout-globe-aura-pulse" />

          {/* Live Telemetry Node Beacons */}
          <div className="cutout-telemetry-beacon beacon-east">
            <span className="beacon-ping" />
            <span className="beacon-tag">LON // 51.50° N</span>
          </div>

          <div className="cutout-telemetry-beacon beacon-west">
            <span className="beacon-ping" />
            <span className="beacon-tag">NYC // 40.71° N</span>
          </div>

          <div className="cutout-telemetry-beacon beacon-asia">
            <span className="beacon-ping" />
            <span className="beacon-tag">TKO // 35.67° N</span>
          </div>
        </div>

        {/* Foreground Atmospheric Smoke Drift Overlay */}
        <div className="landing-cutout-smoke-stream stream-1" />
        <div className="landing-cutout-smoke-stream stream-2" />
      </div>

      {/* Outer Fade Vignette to Guarantee 100% Zero-Edge Blending */}
      <div className="landing-cutout-edge-dissolve" />
    </div>
  );
}
