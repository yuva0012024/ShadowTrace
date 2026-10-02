import React, { useState, useEffect } from 'react';
import { Navigation, ShieldCheck, MapPin, X } from 'lucide-react';

const STORAGE_ASKED_KEY = 'shadowtrace_location_permission_asked';
const STORAGE_STATUS_KEY = 'shadowtrace_location_permission';

export default function LocationPermissionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if the user has already been prompted
    const hasAsked = localStorage.getItem(STORAGE_ASKED_KEY);
    if (!hasAsked) {
      // Delay slightly for smooth page entrance
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllow = () => {
    setIsRequesting(true);
    localStorage.setItem(STORAGE_ASKED_KEY, 'true');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          localStorage.setItem(STORAGE_STATUS_KEY, 'granted');
          localStorage.setItem(
            'shadowtrace_device_coords',
            JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now()
            })
          );
          setIsRequesting(false);
          setIsOpen(false);
          window.dispatchEvent(new Event('shadowtrace_location_updated'));
        },
        (error) => {
          console.info('[ShadowTrace Geolocation] Device location declined or unavailable:', error.message);
          localStorage.setItem(STORAGE_STATUS_KEY, 'denied');
          setIsRequesting(false);
          setIsOpen(false);
          window.dispatchEvent(new Event('shadowtrace_location_updated'));
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    } else {
      localStorage.setItem(STORAGE_STATUS_KEY, 'unsupported');
      setIsRequesting(false);
      setIsOpen(false);
    }
  };

  const handleDeny = () => {
    localStorage.setItem(STORAGE_ASKED_KEY, 'true');
    localStorage.setItem(STORAGE_STATUS_KEY, 'denied');
    setIsOpen(false);
    window.dispatchEvent(new Event('shadowtrace_location_updated'));
  };

  if (!isOpen) return null;

  return (
    <div className="cinematic-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="loc-modal-title">
      <div className="cinematic-location-modal-card">
        <button
          type="button"
          className="modal-close-corner-btn"
          onClick={handleDeny}
          aria-label="Close location dialog"
        >
          <X size={16} />
        </button>

        <div className="location-modal-icon-wrapper">
          <div className="location-modal-icon-glow" />
          <div className="location-modal-icon-shell">
            <Navigation size={28} className="text-gold" />
          </div>
        </div>

        <div className="location-modal-badge">
          <MapPin size={12} />
          <span>DEVICE LOCATION PERMISSION</span>
        </div>

        <h2 id="loc-modal-title" className="location-modal-title">
          LOCATION ACCESS
        </h2>

        <p className="location-modal-description">
          ShadowTrace can use your device location to provide location-aware features. Allow location access?
        </p>

        <div className="location-modal-privacy-callout">
          <ShieldCheck size={16} className="text-gold" />
          <span>
            <strong>Distinction:</strong> Device location is used locally for situational awareness only. It is completely independent from external target IP address analysis.
          </span>
        </div>

        <div className="location-modal-actions">
          <button
            type="button"
            className="location-modal-btn-primary"
            onClick={handleAllow}
            disabled={isRequesting}
            id="allow-location-btn"
          >
            {isRequesting ? (
              <>
                <span className="cinematic-btn-spinner" />
                <span>REQUESTING ACCESS...</span>
              </>
            ) : (
              <>
                <Navigation size={15} />
                <span>ALLOW LOCATION</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="location-modal-btn-secondary"
            onClick={handleDeny}
            disabled={isRequesting}
            id="deny-location-btn"
          >
            NOT NOW
          </button>
        </div>
      </div>
    </div>
  );
}
