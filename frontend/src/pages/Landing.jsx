import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  KeyRound,
  UserPlus,
  Crosshair,
  Globe2,
  Lock,
  Download,
  ArrowRight,
  Activity
} from 'lucide-react';
import logoSvg from '../assets/logo/logo.svg';
import LandingCutoutScene from '../components/LandingCutoutScene';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleEnterApp = () => {
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/login');
    }
  };

  const scrollToCapabilities = () => {
    const el = document.getElementById('capabilities-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="cinematic-landing-root">
      {/* Background Atmosphere & Grid Overlay */}
      <div className="cinematic-shared-bg" aria-hidden="true">
        <div className="cinematic-ambient-orb gold-top" />
        <div className="cinematic-ambient-orb gold-bottom" />
        <div className="cinematic-ambient-orb blue-center" />
        <div className="cinematic-grid-overlay" />
        <div className="cinematic-scanline" />
      </div>

      {/* HEADER: Minimal and Premium */}
      <header className="cinematic-entry-header">
        <div className="entry-header-left">
          <div className="entry-brand-logo-wrap">
            <img src={logoSvg} alt="ShadowTrace Emblem" className="entry-brand-logo" />
          </div>
          <div className="entry-brand-identity">
            <span className="entry-brand-title">SHADOWTRACE</span>
            <span className="entry-brand-tagline">TRACE • ANALYZE • REVEAL</span>
          </div>
        </div>

        <nav className="entry-header-right" aria-label="Clearance Navigation">
          {isAuthenticated ? (
            <button
              type="button"
              className="entry-btn-gold"
              onClick={handleEnterApp}
            >
              <span>ENTER CONSOLE</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <>
              <Link to="/login" className="entry-nav-login-btn" id="entry-nav-login">
                <KeyRound size={13} />
                <span>OPERATIVE LOGIN</span>
              </Link>
              <Link to="/signup" className="entry-nav-signup-btn" id="entry-nav-signup">
                <UserPlus size={13} />
                <span>CREATE ACCOUNT</span>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* MAIN HERO SURVEILLANCE STAGE */}
      <section className="cinematic-entry-hero-stage">
        {/* LEFT SIDE HERO: Premium Cinematic Typography & Action Controls */}
        <div className="cinematic-hero-left">
          <div className="hero-status-pill">
            <span className="hero-status-pulse-dot" />
            <span>GLOBAL SIGNAL RECONNAISSANCE PROTOCOL</span>
          </div>

          <h1 className="cinematic-hero-headline">
            <span className="headline-brand">SHADOWTRACE</span>
            <span className="headline-middle">DIGITAL LOCATION</span>
            <span className="headline-accent">INTELLIGENCE</span>
          </h1>

          <p className="cinematic-hero-quote">
            Every signal leaves a trace.<br />
            Follow the digital shadow.
          </p>

          <div className="cinematic-hero-actions">
            <button
              type="button"
              className="btn-enter-shadow"
              onClick={handleEnterApp}
              id="btn-enter-digital-shadow"
            >
              <span>{isAuthenticated ? 'ENTER THE DIGITAL SHADOW' : 'ENTER THE DIGITAL SHADOW'}</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              className="btn-explore-shadowtrace"
              onClick={scrollToCapabilities}
              id="btn-explore-shadowtrace"
            >
              <span>EXPLORE SHADOWTRACE</span>
            </button>
          </div>

          {/* Minimalist Security Indicators */}
          <div className="cinematic-security-row">
            <div className="security-tag">
              <Shield size={13} className="text-gold" />
              <span>ZERO-TRUST ENCRYPTION</span>
            </div>
            <span className="security-separator">•</span>
            <div className="security-tag">
              <Lock size={13} className="text-gold" />
              <span>EMAIL OTP PROTOCOL</span>
            </div>
            <span className="security-separator">•</span>
            <div className="security-tag">
              <Activity size={13} className="text-gold" />
              <span>REAL-TIME TELEMETRY</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE HERO: Realistic Cinematic Cutout Experience */}
        <div className="cinematic-hero-right">
          <LandingCutoutScene />
        </div>
      </section>

      {/* CORE TACTICAL CAPABILITIES SECTION */}
      <section id="capabilities-section" className="landing-capabilities-section">
        <div className="capabilities-header">
          <span className="capabilities-label">SYSTEM PROTOCOLS</span>
          <h2 className="capabilities-title">TACTICAL INTELLIGENCE CAPABILITIES</h2>
          <p className="capabilities-subtitle">
            Enterprise-grade geospatial signal tracking, multi-target clustering, and persistent audit dossiers.
          </p>
        </div>

        <div className="capabilities-grid">
          {/* Feature 1 */}
          <div className="capability-card">
            <div className="capability-icon-shell">
              <Crosshair size={22} className="text-gold" />
            </div>
            <h3 className="capability-card-title">PRECISION IP RECONNAISSANCE</h3>
            <p className="capability-card-desc">
              Execute high-velocity single or batch IP analysis to pinpoint routing centers, ASNs, ISPs, regional administrative nodes, and coordinates.
            </p>
            <div className="capability-tag">RFC-791 COMPLIANT</div>
          </div>

          {/* Feature 2 */}
          <div className="capability-card">
            <div className="capability-icon-shell">
              <Globe2 size={22} className="text-gold" />
            </div>
            <h3 className="capability-card-title">CARTOGRAPHIC SURVEILLANCE</h3>
            <p className="capability-card-desc">
              Seamlessly toggle between high-fidelity labeled cartographic vectors and high-resolution Esri satellite imagery with real-time border and municipality overlays.
            </p>
            <div className="capability-tag">SATELLITE & HYBRID</div>
          </div>

          {/* Feature 3 */}
          <div className="capability-card">
            <div className="capability-icon-shell">
              <Download size={22} className="text-gold" />
            </div>
            <h3 className="capability-card-title">ENCRYPTED DOSSIER ARCHIVE</h3>
            <p className="capability-card-desc">
              Zero-loss session persistence powered by MongoDB. Export forensic investigation dossiers in clean CSV or structured JSON formats with complete metadata.
            </p>
            <div className="capability-tag">CSV • JSON EXPORT</div>
          </div>

          {/* Feature 4 */}
          <div className="capability-card">
            <div className="capability-icon-shell">
              <Shield size={22} className="text-gold" />
            </div>
            <h3 className="capability-card-title">ZERO-TRUST CLEARANCE & NOTIFICATIONS</h3>
            <p className="capability-card-desc">
              Multi-factor email OTP account validation, granular role clearance, server-side admin management, and live operative notification telemetry.
            </p>
            <div className="capability-tag">6-DIGIT EMAIL OTP</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-top">
          <div className="landing-footer-brand">
            <img src={logoSvg} alt="ShadowTrace" className="footer-logo-small" />
            <span>SHADOWTRACE LOCATION INTELLIGENCE SYSTEM</span>
          </div>
          <div className="landing-footer-links">
            <Link to="/login">LOGIN</Link>
            <Link to="/signup">ENROLL OPERATIVE</Link>
            <button type="button" onClick={handleEnterApp} className="footer-action-link">
              ENTER SYSTEM
            </button>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>&copy; {new Date().getFullYear()} ShadowTrace Inc. All rights reserved. Zero-trust intelligence protocol.</span>
          <span className="mono-font text-gold">AES-GCM-256 • CLEARANCE LEVEL 5</span>
        </div>
      </footer>
    </div>
  );
}
