import React, { useEffect, useRef, useState } from 'react';
import devilGlobeImg from '../assets/images/cinematic-devil-globe.jpg';
import earthMapImg from '../assets/images/earth-cyber-map.jpg';
import shadowHandImg from '../assets/images/shadow-hand.jpg';

export default function CinematicScene() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Listen for prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Smooth Mouse Parallax Handler
  useEffect(() => {
    if (reducedMotion) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animId;

    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      // Normalized between -1 and 1
      targetX = (e.clientX - innerWidth / 2) / (innerWidth / 2);
      targetY = (e.clientY - innerHeight / 2) / (innerHeight / 2);
    };

    const updateParallax = () => {
      // Lerp for cinematic dampening
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

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

  // Ethereal Particle Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle Generation
    const particleCount = reducedMotion ? 15 : 45;
    const particles = [];
    const colors = [
      'rgba(224, 185, 79, ',  // Gold
      'rgba(200, 162, 58, ',  // Amber
      'rgba(56, 189, 248, ',  // Faint Cyan
      'rgba(243, 210, 117, '  // Bright Gold
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.6,
        colorBase: colors[Math.floor(Math.random() * colors.length)],
        baseAlpha: Math.random() * 0.5 + 0.2,
        alpha: 0.3,
        speedX: (Math.random() - 0.5) * 0.35,
        speedY: -(Math.random() * 0.45 + 0.15),
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseVal: Math.random() * Math.PI
      });
    }

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw and update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!reducedMotion) {
          p.x += p.speedX;
          p.y += p.speedY;
          p.pulseVal += p.pulseSpeed;
          p.alpha = p.baseAlpha + Math.sin(p.pulseVal) * 0.18;

          // Wrap edges
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.colorBase}${Math.max(0.05, p.alpha)})`;
        ctx.shadowColor = '#E0B94F';
        ctx.shadowBlur = p.radius > 1.2 ? 6 : 2;
        ctx.fill();

        // Connect nearby particles with subtle intelligence telemetry filaments
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 75) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(200, 162, 58, ${(1 - dist / 75) * 0.12})`;
            ctx.lineWidth = 0.6;
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

  // Parallax Offsets
  const devilOffset = `translate3d(${parallax.x * 4}px, ${parallax.y * 3}px, 0)`;
  const globeOffset = `translate3d(${parallax.x * 7}px, ${parallax.y * 6}px, 0)`;
  const handOffset = `translate3d(${parallax.x * 9}px, ${parallax.y * 7}px, 0)`;

  return (
    <aside className="cinematic-right-scene" ref={containerRef} aria-hidden="true">
      <div className="cinematic-scene-viewport">
        {/* Layer 1: Dark Devil Guardian Master Silhouette */}
        <div
          className="cinematic-devil-backdrop"
          style={{ transform: reducedMotion ? 'none' : devilOffset }}
        >
          <img
            src={devilGlobeImg}
            alt="Shadow Guardian Intelligence"
            className="cinematic-devil-image"
            loading="eager"
          />
        </div>

        {/* Shadow Shroud & Gradient Blending */}
        <div className="cinematic-shroud" />

        {/* Layer 2: Giant Rotating Earth Globe */}
        <div
          className="cinematic-globe-container"
          style={{ transform: reducedMotion ? 'none' : globeOffset }}
        >
          {/* Outer Digital Latitude/Longitude Dashed Ring */}
          <div className="cinematic-globe-grid-ring" />

          {/* Orbital Satellite Tracking Ring */}
          <div className="cinematic-orbital-ring">
            <div className="cinematic-orbit-tracer" />
          </div>

          {/* Spherical Globe Body */}
          <div className="cinematic-globe-sphere">
            {/* Seamless 360-Degree Continuous Rotating Texture */}
            <div className="cinematic-globe-track">
              <img
                src={earthMapImg}
                alt="Digital Earth Texture Track 1"
                className="cinematic-globe-texture"
              />
              <img
                src={earthMapImg}
                alt="Digital Earth Texture Track 2"
                className="cinematic-globe-texture"
              />
            </div>

            {/* 3D Spherical Atmosphere, Specular Light & Shadow Vignette */}
            <div className="cinematic-globe-shading" />
          </div>

          {/* Active Global Intelligence Beacons */}
          <div className="cinematic-globe-beacon beacon-1">
            <span className="cinematic-beacon-dot" />
            <span className="cinematic-beacon-tag">NYC // 40.71° N</span>
          </div>

          <div className="cinematic-globe-beacon beacon-2">
            <span className="cinematic-beacon-dot" />
            <span className="cinematic-beacon-tag">LON // 51.50° N</span>
          </div>
        </div>

        {/* Layer 3: Mysterious Shadow Hand Interacting with Globe */}
        <div
          className="cinematic-shadow-hand-layer"
          style={{ transform: reducedMotion ? 'none' : handOffset }}
        >
          <div className="cinematic-shadow-hand-wrap">
            <img
              src={shadowHandImg}
              alt="Shadow Hand Tracing Earth"
              className="cinematic-shadow-hand-img"
            />
          </div>
        </div>

        {/* Layer 4: Intelligence Telemetry HUD Badges */}
        <div className="cinematic-telemetry-badge top-right">
          <span className="cinematic-live-dot" />
          <span>SHADOWTRACE // GLOBAL MONITORING ACTIVE</span>
        </div>

        <div className="cinematic-telemetry-badge bottom-right">
          <span>LATENCY: 12ms • CIPHER: AES-GCM-256 • CLEARANCE: LEVEL 5</span>
        </div>

        {/* Layer 5: Ethereal Floating Dust & Intelligence Telemetry Particles */}
        <canvas ref={canvasRef} className="cinematic-particle-canvas" />

        {/* Layer 6: Ambient Volumetric Fog */}
        <div className="cinematic-smoke-layer" />
      </div>
    </aside>
  );
}
