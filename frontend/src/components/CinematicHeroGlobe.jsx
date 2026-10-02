import React, { Component } from 'react';
import cinematicGlobeImg from '../assets/images/cinematic-globe-transparent.png';

/**
 * Error boundary specifically isolating the hero globe visual component.
 * Prevents any graphics or animation error from interrupting dashboard functionality.
 */
class GlobeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[ShadowTrace] CinematicHeroGlobe visual fallback engaged:', error?.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="cinematic-hero-globe-fallback" aria-hidden="true">
          <div className="fallback-ambient-sphere" />
        </div>
      );
    }
    return this.props.children;
  }
}

function CinematicHeroGlobeInner() {
  return (
    <div className="cinematic-hero-globe-container" aria-hidden="true">
      {/* 1. Deep Atmospheric Golden Glow Layer */}
      <div className="globe-atmospheric-halo" />
      <div className="globe-ambient-radial-glow" />

      {/* 2. Interactive SVG Orbital Coordinate Rings */}
      <svg className="globe-orbital-rings-svg" viewBox="0 0 400 400" fill="none">
        <defs>
          <linearGradient id="goldOrbitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C8A23A" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#F3D275" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#C8A23A" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="goldOrbitGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E0B94F" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#8A6E24" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#E0B94F" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* Outer Orbital Ring 1 */}
        <ellipse
          cx="200"
          cy="200"
          rx="178"
          ry="65"
          className="orbit-ring-ellipse ring-tilt-1"
          stroke="url(#goldOrbitGrad1)"
          strokeWidth="1.2"
          strokeDasharray="4 8 16 8"
        />

        {/* Inner Counter Orbital Ring 2 */}
        <ellipse
          cx="200"
          cy="200"
          rx="164"
          ry="54"
          className="orbit-ring-ellipse ring-tilt-2"
          stroke="url(#goldOrbitGrad2)"
          strokeWidth="1"
          strokeDasharray="2 6 24 6"
        />
      </svg>

      {/* 3. Floating Network Data Nodes & Beacons */}
      <div className="globe-beacons-layer">
        <span className="globe-beacon beacon-pos-1" title="Signal Node" />
        <span className="globe-beacon beacon-pos-2" title="Signal Node" />
        <span className="globe-beacon beacon-pos-3" title="Signal Node" />
      </div>

      {/* 4. Realistic Digital Earth Floating Cutout (Zero black rectangle) */}
      <div className="cinematic-globe-disc-wrapper">
        <img
          src={cinematicGlobeImg}
          alt="ShadowTrace Cinematic Digital Earth"
          className="cinematic-globe-disc"
          loading="eager"
        />
      </div>

      {/* 5. Volumetric Surface Lighting Depth Overlay */}
      <div className="globe-volumetric-shading" />
    </div>
  );
}

export default function CinematicHeroGlobe() {
  return (
    <GlobeErrorBoundary>
      <CinematicHeroGlobeInner />
    </GlobeErrorBoundary>
  );
}
