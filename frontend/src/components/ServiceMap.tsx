import React, { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ServiceMapProps {
  locationType: 'In-Person' | 'Online';
  locationArea?: string;
  locationDetails?: string;
  locationLat?: number | string;
  locationLng?: number | string;
}

const ISTANBUL_DISTRICTS: Record<string, { lat: number; lng: number; name: string }> = {
  'Besiktas': { lat: 41.0422, lng: 29.0089, name: 'Beşiktaş' },
  'Kadikoy': { lat: 40.9819, lng: 29.0244, name: 'Kadıköy' },
  'Sisli': { lat: 41.0603, lng: 28.9878, name: 'Şişli' },
  'Beyoglu': { lat: 41.0369, lng: 28.9850, name: 'Beyoğlu' },
  'Uskudar': { lat: 41.0214, lng: 29.0125, name: 'Üsküdar' },
  'Fatih': { lat: 41.0186, lng: 28.9497, name: 'Fatih' },
  'Bakirkoy': { lat: 40.9833, lng: 28.8500, name: 'Bakırköy' },
  'Maltepe': { lat: 40.9333, lng: 29.1167, name: 'Maltepe' },
  'Atasehir': { lat: 40.9833, lng: 29.1167, name: 'Ataşehir' },
};

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export function ServiceMap({ locationType, locationArea, locationDetails, locationLat, locationLng }: ServiceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (locationType === 'Online' || !mapRef.current) {
      return;
    }

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Determine coordinates: use district lookup for fuzzy location (never show exact coordinates)
    let lat: number;
    let lng: number;
    let displayName: string = locationArea || 'Istanbul';

    if (locationArea && ISTANBUL_DISTRICTS[locationArea]) {
      // Use predefined district coordinates (fuzzy location)
      const district = ISTANBUL_DISTRICTS[locationArea];
      lat = district.lat;
      lng = district.lng;
      displayName = district.name;
    } else {
      // Default to Istanbul center
      lat = 41.0082;
      lng = 28.9784;
    }

    // Create map centered on the location (always use district-level zoom for fuzzy location)
    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 13, // Always use district-level zoom to hide exact location
      zoomControl: true,
      attributionControl: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add marker for the location
    const marker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    }).addTo(map);

    // Add popup with area name
    marker.bindPopup(`<b>${displayName}</b><br>Approximate location`).openPopup();

    // Add circle to show approximate area (not exact address) - increased radius for better visibility
    L.circle([lat, lng], {
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.15,
      radius: 3000, // 3km radius to show approximate area and hide exact location
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locationType, locationArea, locationLat, locationLng]);

  if (locationType === 'Online') {
    return (
      <div className="w-full h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center border border-blue-200">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-gray-700 font-medium">Online Service</p>
          <p className="text-sm text-gray-600 mt-1">This service will be conducted online</p>
        </div>
      </div>
    );
  }

  // For In-Person services, always show a map (even if location_area is not specified)
  const district = locationArea ? ISTANBUL_DISTRICTS[locationArea] : null;
  const displayName = district ? district.name : (locationArea || 'Istanbul');
  const hasSpecificLocation = !!(locationLat && locationLng) || !!district;

  return (
    <div className="w-full h-64 rounded-lg border border-green-200 overflow-hidden relative">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-3 border-t border-green-200">
        <p className="text-sm text-gray-700 font-medium">
          {hasSpecificLocation ? `${displayName}, Istanbul` : 'Istanbul Area'}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          {locationDetails || (hasSpecificLocation 
            ? 'Approximate location - exact address will be shared after handshake confirmation'
            : 'Location area will be specified by the provider - exact address will be shared after handshake confirmation')}
        </p>
      </div>
    </div>
  );
}
