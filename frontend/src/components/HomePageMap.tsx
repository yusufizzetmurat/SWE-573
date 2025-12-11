import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { getAchievementMeta } from '../lib/achievements';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ServiceLocation {
  id: string;
  title: string;
  location_area?: string;
  location_type: 'In-Person' | 'Online';
  location_lat?: number | string;
  location_lng?: number | string;
  type: 'Offer' | 'Need';
  user?: {
    badges?: string[];
    first_name?: string;
    last_name?: string;
  } | string;
}

interface HomePageMapProps {
  services?: ServiceLocation[];
  onNavigate?: (page: string, data?: { id: string; [key: string]: any }) => void;
}

const ISTANBUL_CENTER: [number, number] = [41.0082, 28.9784];

const DISTRICT_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  besiktas: { lat: 41.0422, lng: 29.0089, name: 'Beşiktaş' },
  kadikoy: { lat: 40.9819, lng: 29.0244, name: 'Kadıköy' },
  sisli: { lat: 41.0603, lng: 28.9878, name: 'Şişli' },
  beyoglu: { lat: 41.0369, lng: 28.9850, name: 'Beyoğlu' },
  uskudar: { lat: 41.0214, lng: 29.0125, name: 'Üsküdar' },
  fatih: { lat: 41.0186, lng: 28.9497, name: 'Fatih' },
  bakirkoy: { lat: 40.9833, lng: 28.8500, name: 'Bakırköy' },
  maltepe: { lat: 40.9333, lng: 29.1167, name: 'Maltepe' },
  atasehir: { lat: 40.9833, lng: 29.1167, name: 'Ataşehir' },
  kartal: { lat: 40.9128, lng: 29.1827, name: 'Kartal' },
  sarıyer: { lat: 41.1694, lng: 29.0503, name: 'Sarıyer' },
  sariyer: { lat: 41.1694, lng: 29.0503, name: 'Sarıyer' },
  eyupsultan: { lat: 41.0465, lng: 28.9320, name: 'Eyüpsultan' },
};

const normalizeArea = (value?: string) =>
  value
    ? value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '')
    : '';

const circleColors = {
  Offer: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
    gradient: 'from-green-400 to-emerald-500',
  },
  Need: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    gradient: 'from-blue-400 to-indigo-500',
  },
  Mixed: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    gradient: 'from-amber-400 to-orange-500',
  },
};

type MarkerGroup = {
  position: [number, number];
  services: ServiceLocation[];
  label: string;
  type: 'Offer' | 'Need' | 'Mixed';
};

// Component to create circles with fixed geographic size (meters) that maintain size regardless of zoom
// Middle circle is clickable and shows hover tooltip
function ZoomResponsiveCircles({ 
  position, 
  colors, 
  baseOuterRadius, 
  baseMiddleRadius,
  services,
  onNavigate
}: { 
  position: [number, number]; 
  colors: typeof circleColors.Offer;
  baseOuterRadius: number; // in meters
  baseMiddleRadius: number; // in meters
  services: ServiceLocation[];
  onNavigate?: (page: string, data?: { id: string; [key: string]: any }) => void;
}) {
  const map = useMap();
  const outerCircleRef = useRef<L.Circle | null>(null);
  const middleCircleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    // Create or update outer circle (uses meters, maintains geographic size)
    if (!outerCircleRef.current) {
      const outerCircle = L.circle(position, {
        radius: baseOuterRadius,
        color: colors.main,
        fillColor: colors.main,
        fillOpacity: 0.15,
        weight: 3,
        opacity: 0.6,
        interactive: false,
      });
      outerCircle.addTo(map);
      outerCircleRef.current = outerCircle;
    } else {
      outerCircleRef.current.setRadius(baseOuterRadius);
      outerCircleRef.current.setLatLng(position);
    }
    
    // Create or update middle circle (uses meters, maintains geographic size, clickable)
    if (!middleCircleRef.current) {
      const middleCircle = L.circle(position, {
        radius: baseMiddleRadius,
        color: colors.light,
        fillColor: colors.light,
        fillOpacity: 0.2,
        weight: 2,
        opacity: 0.5,
        interactive: true,
      });
      
      // Create tooltip content showing service count
      const serviceCount = services.length;
      const serviceText = serviceCount === 1 ? 'service' : 'services';
      const firstService = services[0];
      const tooltipContent = `
        <div style="font-weight: 600; margin-bottom: 4px; color: white;">${firstService.title}</div>
        <div style="font-size: 12px; color: rgba(255, 255, 255, 0.9);">${serviceCount} ${serviceText} • Click to view</div>
      `;
      
      middleCircle.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        className: 'custom-tooltip',
        offset: [0, -10],
      });
      
      // Handle click - navigate to first service or show popup if multiple
      middleCircle.on('click', () => {
        if (onNavigate && firstService) {
          onNavigate('service-detail', { id: firstService.id });
        }
      });
      
      // Change cursor on hover
      middleCircle.on('mouseover', function() {
        this.setStyle({
          fillOpacity: 0.3,
          weight: 3,
        });
        if (map.getContainer()) {
          map.getContainer().style.cursor = 'pointer';
        }
      });
      
      middleCircle.on('mouseout', function() {
        this.setStyle({
          fillOpacity: 0.2,
          weight: 2,
        });
        if (map.getContainer()) {
          map.getContainer().style.cursor = '';
        }
      });
      
      middleCircle.addTo(map);
      middleCircleRef.current = middleCircle;
    } else {
      middleCircleRef.current.setRadius(baseMiddleRadius);
      middleCircleRef.current.setLatLng(position);
      
      // Update tooltip content
      const serviceCount = services.length;
      const serviceText = serviceCount === 1 ? 'service' : 'services';
      const firstService = services[0];
      const tooltipContent = `
        <div style="font-weight: 600; margin-bottom: 4px; color: white;">${firstService.title}</div>
        <div style="font-size: 12px; color: rgba(255, 255, 255, 0.9);">${serviceCount} ${serviceText} • Click to view</div>
      `;
      middleCircleRef.current.setTooltipContent(tooltipContent);
    }
    
    return () => {
      if (outerCircleRef.current) {
        map.removeLayer(outerCircleRef.current);
        outerCircleRef.current = null;
      }
      if (middleCircleRef.current) {
        map.removeLayer(middleCircleRef.current);
        middleCircleRef.current = null;
      }
    };
  }, [position, colors, map, baseOuterRadius, baseMiddleRadius, services, onNavigate]);

  return null;
}

export function HomePageMap({ services = [], onNavigate }: HomePageMapProps) {
  const [isClient, setIsClient] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      // Small delay to ensure DOM is ready and container has dimensions
      const timer = setTimeout(() => {
        setMapReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isClient]);

  const markerGroups = useMemo<MarkerGroup[]>(() => {
    if (!services.length) return [];

    const groups = new Map<string, MarkerGroup>();

    services.forEach((service, index) => {
      let position: [number, number] | undefined;
      let label = 'Istanbul';

      // Priority 1: Use district lookup for fuzzy location (never show exact coordinates)
      if (service.location_type === 'In-Person' && service.location_area) {
        const normalized = normalizeArea(service.location_area);
        const district = DISTRICT_COORDS[normalized];
        if (district) {
          position = [district.lat, district.lng];
          label = district.name;
        }
      }

      // Priority 2: Use district lookup if coordinates not available (fallback)
      if (!position && service.location_type === 'In-Person' && service.location_area) {
        const normalized = normalizeArea(service.location_area);
        const district = DISTRICT_COORDS[normalized];
        if (district) {
          position = [district.lat, district.lng];
          label = district.name;
        }
      }

      // Priority 3: Fallback to clustering online or unmapped services
      if (!position) {
        // cluster online or unmapped services near the golden horn with slight offsets
        const offset = (index % 6) * 0.01;
        position = [ISTANBUL_CENTER[0] + offset, ISTANBUL_CENTER[1] + offset * 0.6];
        label = service.location_type === 'Online' ? 'Online Service' : service.location_area || 'Istanbul';
      }

      const key = `${position[0].toFixed(3)}-${position[1].toFixed(3)}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          position,
          services: [service],
          label,
          type: service.type,
        });
      } else {
        existing.services.push(service);
        existing.type = existing.type === service.type ? existing.type : 'Mixed';
      }
    });

    return Array.from(groups.values());
  }, [services]);

  if (!isClient || !mapReady) {
    return (
      <div className="w-full h-[400px] bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-lg border border-gray-200 relative overflow-hidden flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p>Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="w-full h-[400px] rounded-lg border border-gray-200 overflow-hidden shadow-lg" style={{ minHeight: '400px', position: 'relative', zIndex: 0 }}>
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .custom-popup .leaflet-popup-tip {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .custom-tooltip {
          background: rgba(0, 0, 0, 0.85);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .custom-tooltip::before {
          border-top-color: rgba(0, 0, 0, 0.85) !important;
        }
      `}</style>
      <MapContainer
        center={ISTANBUL_CENTER}
        zoom={11}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={true}
        key="homepage-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        {markerGroups.length > 0 && markerGroups.map((group, index) => {
          const colors = circleColors[group.type];
          // Base radii in meters - maintains geographic size regardless of zoom
          const baseOuterRadius = 700; // 700 meters
          const baseMiddleRadius = 400; // 400 meters
          
          return (
            <React.Fragment key={`${group.label}-${index}-${group.position[0]}-${group.position[1]}`}>
              {/* Interactive circles - middle circle is clickable */}
              <ZoomResponsiveCircles 
                position={group.position}
                colors={colors}
                baseOuterRadius={baseOuterRadius}
                baseMiddleRadius={baseMiddleRadius}
                services={group.services}
                onNavigate={onNavigate}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

