import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Info, Maximize2, Minimize2, Globe, Layers, AlertTriangle } from 'lucide-react';

// Custom Gold Teardrop Reticle Pin Marker Icon for ShadowTrace Intelligence
const createGoldPinIcon = () => {
  return L.divIcon({
    className: 'custom-gold-marker-pin',
    html: `
      <div style="position: relative; width: 34px; height: 42px; transform: translate(-50%, -100%);">
        <svg viewBox="0 0 34 42" width="34" height="42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.85));">
          <path d="M17 0C7.61 0 0 7.61 0 17C0 29.75 17 42 17 42C17 42 34 29.75 34 17C34 7.61 26.39 0 17 0Z" fill="#C8A23A" stroke="#E0B94F" stroke-width="1.8"/>
          <circle cx="17" cy="17" r="7" fill="#0D1015" stroke="#E0B94F" stroke-width="1.6"/>
          <circle cx="17" cy="17" r="3" fill="#E0B94F"/>
        </svg>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -42]
  });
};

// Dot Icon for multiple batch markers
const createDotIcon = (isPrivate = false) => {
  const color = isPrivate ? '#f59e0b' : '#22c55e';
  const glow = isPrivate ? 'rgba(245, 158, 11, 0.45)' : 'rgba(34, 197, 94, 0.45)';
  return L.divIcon({
    className: 'custom-dot-marker',
    html: `
      <div style="
        position: relative;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid #07090C;
        box-shadow: 0 0 12px ${glow};
        transform: translate(-50%, -50%);
      "></div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -12]
  });
};

// Map controller to handle initial World View and fly-to transitions
function MapFlyController({ markers, triggerReset }) {
  const map = useMap();
  const hasMovedRef = useRef(false);

  useEffect(() => {
    if (triggerReset) {
      map.setView([20.0, 0.0], 2, { animate: true, duration: 1.2 });
      return;
    }

    if (!markers || markers.length === 0) {
      map.setView([20.0, 0.0], 2);
      return;
    }

    if (markers.length === 1) {
      const { lat, lon } = markers[0];
      // World view -> fly to destination with smooth Leaflet animation
      map.flyTo([lat, lon], 9, {
        animate: true,
        duration: 1.6,
        easeLinearity: 0.25
      });
      hasMovedRef.current = true;
    } else {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lon]));
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 11,
        animate: true,
        duration: 1.5
      });
      hasMovedRef.current = true;
    }
  }, [markers, map, triggerReset]);

  return null;
}

// Invalidate size on fullscreen toggle and resize
function MapResizeHandler({ isFullscreen }) {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    const timer = setTimeout(handleResize, 200);
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isFullscreen, map]);

  return null;
}

export default function MapView({
  records = [],
  height = 440,
  showNotice = true,
  usePins = true,
  title = 'Geospatial Reconnaissance'
}) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState('default'); // 'default' | 'satellite'
  const [resetCount, setResetCount] = useState(0);
  const [tileError, setTileError] = useState(false);

  // Extract valid coordinates from records
  const validMarkers = useMemo(() => {
    return records
      .filter((r) => r && r.latitude !== null && r.longitude !== null && !isNaN(r.latitude) && !isNaN(r.longitude))
      .map((r) => ({
        lat: Number(r.latitude),
        lon: Number(r.longitude),
        ip: r.ipAddress,
        city: r.city && r.city !== 'Not available' ? r.city : '',
        region: r.region && r.region !== 'Not available' ? r.region : '',
        district: r.district && r.district !== 'Not available' ? r.district : '',
        country: r.country && r.country !== 'Not available' ? r.country : '',
        isp: r.isp && r.isp !== 'Not available' ? r.isp : '',
        asn: r.asn && r.asn !== 'Not available' ? r.asn : '',
        isPrivate: !!r.isPrivate
      }));
  }, [records]);

  // Fullscreen management using browser Fullscreen API
  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (containerRef.current?.webkitRequestFullscreen) {
          await containerRef.current.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('[ShadowTrace Map] Fullscreen toggle fallback:', err.message);
      // Fallback CSS-based fullscreen toggle
      setIsFullscreen((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFs);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const handleWorldView = () => {
    setResetCount((prev) => prev + 1);
  };

  return (
    <div
      ref={containerRef}
      className={`map-panel-card ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {/* Map Control Toolbar */}
      <div className="map-toolbar-header">
        <div className="map-toolbar-left">
          <Globe size={16} className="text-gold" />
          <span className="map-toolbar-title">{title}</span>
          {validMarkers.length > 0 && (
            <span className="map-marker-count-pill">
              {validMarkers.length} {validMarkers.length === 1 ? 'Location' : 'Locations'}
            </span>
          )}
        </div>

        <div className="map-toolbar-right">
          {/* MAP STYLE SWITCHER (DEFAULT vs SATELLITE) */}
          <div className="map-style-switcher">
            <span className="map-style-label">
              <Layers size={13} className="text-gold" />
              <span>MAP STYLE:</span>
            </span>
            <div className="map-style-btn-group" role="group" aria-label="Map Layer Switcher">
              <button
                type="button"
                className={`map-style-btn ${mapStyle === 'default' ? 'active' : ''}`}
                onClick={() => setMapStyle('default')}
                title="Street & Cartographic Vector Layer"
              >
                DEFAULT
              </button>
              <button
                type="button"
                className={`map-style-btn ${mapStyle === 'satellite' ? 'active' : ''}`}
                onClick={() => setMapStyle('satellite')}
                title="Esri World Satellite Imagery"
              >
                SATELLITE
              </button>
            </div>
          </div>

          {/* Reset to World Map View */}
          <button
            type="button"
            className="map-toolbar-action-btn"
            onClick={handleWorldView}
            title="Reset to Full World View"
          >
            <Globe size={14} />
            <span className="hide-mobile">WORLD</span>
          </button>

          {/* Real Browser Fullscreen Toggle */}
          <button
            type="button"
            className="map-toolbar-action-btn fullscreen-btn"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Open Full Screen Map'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isFullscreen ? 'EXIT' : 'FULL SCREEN'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Leaflet Map Canvas */}
      <div
        className="map-view-wrapper"
        style={{ height: isFullscreen ? 'calc(100vh - 105px)' : `${height}px` }}
      >
        {validMarkers.length === 0 ? (
          <div className="map-empty-state">
            <MapPin size={38} color="var(--gold-primary)" />
            <span className="map-empty-title">LOCATION DATA UNAVAILABLE</span>
            <span className="map-empty-subtitle">
              Internal private subnet, loopback address, or unresolved IP location
            </span>
          </div>
        ) : (
          <MapContainer
            center={[20.0, 0.0]}
            zoom={2}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', background: '#07090C' }}
          >
            {/* Tile Layer Switching: DEFAULT vs SATELLITE */}
            {mapStyle === 'satellite' ? (
              <>
                <TileLayer
                  key="satellite-base"
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={18}
                  eventHandlers={{
                    tileerror: () => setTileError(true)
                  }}
                />
                <TileLayer
                  key="satellite-labels"
                  attribution='Labels &copy; Esri &mdash; Boundaries and Places'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={18}
                  opacity={0.88}
                />
              </>
            ) : (
              <TileLayer
                key="default-layer"
                attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                maxZoom={19}
                eventHandlers={{
                  tileerror: () => setTileError(true)
                }}
              />
            )}

            {/* Dynamic Controller for World View and Target Fly-To */}
            <MapFlyController
              markers={validMarkers}
              triggerReset={resetCount}
            />

            {/* Invalidate map dimensions on resize & fullscreen transition */}
            <MapResizeHandler isFullscreen={isFullscreen} />

            {/* Render Location Markers */}
            {validMarkers.map((m, idx) => (
              <Marker
                key={`${m.ip}-${idx}`}
                position={[m.lat, m.lon]}
                icon={usePins ? createGoldPinIcon() : createDotIcon(m.isPrivate)}
                ref={(inst) => {
                  if (validMarkers.length === 1 && inst && !inst.isPopupOpen()) {
                    setTimeout(() => inst.openPopup(), 400);
                  }
                }}
              >
                <Popup className="dark-gold-popup">
                  <div className="popup-box">
                    <div className="popup-header">
                      <span className="popup-badge-gold">📍 {m.ip}</span>
                      <span className="popup-coords mono-font">
                        {m.lat.toFixed(4)}°, {m.lon.toFixed(4)}°
                      </span>
                    </div>

                    <div className="popup-details-table" style={{ margin: '8px 0', fontSize: '0.78rem', color: '#ECEEF2', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {m.country && (
                        <div><strong style={{ color: '#C8A23A' }}>Country:</strong> {m.country}</div>
                      )}
                      {m.region && (
                        <div><strong style={{ color: '#C8A23A' }}>Region:</strong> {m.region}</div>
                      )}
                      {m.district && (
                        <div><strong style={{ color: '#C8A23A' }}>District:</strong> {m.district}</div>
                      )}
                      {m.city && (
                        <div><strong style={{ color: '#C8A23A' }}>City:</strong> {m.city}</div>
                      )}
                      {m.isp && (
                        <div><strong style={{ color: '#C8A23A' }}>ISP:</strong> {m.isp}</div>
                      )}
                      {m.asn && (
                        <div><strong style={{ color: '#C8A23A' }}>ASN:</strong> {m.asn}</div>
                      )}
                    </div>

                    <div className="popup-footer-note" style={{ fontSize: '0.65rem', color: '#E0B94F', letterSpacing: '0.08em', marginTop: '6px', borderTop: '1px solid rgba(200, 162, 58, 0.25)', paddingTop: '4px', textAlign: 'center', fontWeight: '700' }}>
                      APPROXIMATE IP LOCATION
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {tileError && (
          <div className="map-tile-error-banner">
            <AlertTriangle size={14} />
            <span>Map tiles loading in degraded surveillance mode.</span>
          </div>
        )}
      </div>

      {/* Map Bottom Information Bar */}
      {showNotice && (
        <div className="map-bottom-bar">
          <div className="map-notice-left">
            <Info size={15} className="map-notice-icon" />
            <div className="map-notice-text">
              <span className="map-notice-title">APPROXIMATE LOCATION</span>
              <span className="map-notice-desc">
                Geographic coordinates represent approximate ISP routing center or municipality node.
              </span>
            </div>
          </div>

          <div className="map-notice-right">
            <div className="map-layer-indicator mono-font">
              LAYER: {mapStyle.toUpperCase()} • {isFullscreen ? 'FULLSCREEN' : 'STANDARD VIEW'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
