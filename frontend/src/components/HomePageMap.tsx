import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from 'react-leaflet';
import { getBadgeMeta } from '../lib/badges';
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
  Offer: '#22c55e',
  Need: '#2563eb',
  Mixed: '#f97316',
};

type MarkerGroup = {
  position: [number, number];
  services: ServiceLocation[];
  label: string;
  type: 'Offer' | 'Need' | 'Mixed';
};

export function HomePageMap({ services = [] }: HomePageMapProps) {
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
    <div ref={mapRef} className="w-full h-[400px] rounded-lg border border-gray-200 overflow-hidden" style={{ minHeight: '400px', position: 'relative', zIndex: 0 }}>
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {markerGroups.length > 0 && markerGroups.map((group, index) => {
          const color = circleColors[group.type];
          // Use fixed radius in meters (5000m = 5km) to maintain fuzzy location regardless of zoom
          const radiusMeters = 5000;
          return (
            <React.Fragment key={`${group.label}-${index}-${group.position[0]}-${group.position[1]}`}>
              <Circle
                center={group.position}
                radius={radiusMeters}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.3, weight: 2 }}
              />
              <CircleMarker
                center={group.position}
                radius={8}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <div className="space-y-2 min-w-[200px]">
                    <div className="font-semibold text-gray-900">{group.label}</div>
                    <div className="text-xs text-gray-500">
                      {group.services.length} {group.services.length === 1 ? 'service' : 'services'} nearby
                    </div>
                    <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 max-w-sm">
                      {group.services.slice(0, 5).map((service) => {
                        const provider = typeof service.user === 'object' ? service.user : null;
                        const badgeMeta = provider?.badges && provider?.badges.length
                          ? getBadgeMeta(provider.badges[0])
                          : undefined;
                        const BadgeIcon = badgeMeta?.icon;
                        return (
                          <li key={service.id}>
                            <span className="font-medium text-gray-900">{service.title}</span>
                            <span className="ml-2 text-xs uppercase tracking-wide text-gray-500">{service.type}</span>
                            {badgeMeta && BadgeIcon && (
                              <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                                <BadgeIcon className="w-3 h-3" />
                                {badgeMeta.label}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {group.services.length > 5 && (
                      <div className="text-xs text-gray-500">+{group.services.length - 5} more services in this area</div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

