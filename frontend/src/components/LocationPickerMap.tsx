import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerMapProps {
  onLocationSelect: (location: { lat: number; lng: number; area?: string }) => void;
  initialLocation?: { lat: number; lng: number };
  required?: boolean;
}

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Istanbul center coordinates
const ISTANBUL_CENTER = { lat: 41.0082, lng: 28.9784 };

export function LocationPickerMap({ onLocationSelect, initialLocation, required }: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const onLocationSelectRef = useRef(onLocationSelect);
  const hasInitializedRef = useRef(false);

  // Keep callback ref up to date
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (!mapRef.current) return;

    // If map already exists, don't reinitialize
    if (mapInstanceRef.current) return;

    const startLocation = initialLocation || ISTANBUL_CENTER;

    // Ensure container has dimensions before initializing
    const container = mapRef.current;
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
      const retryTimer = setTimeout(() => {
        if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
          // Retry initialization
          const map = L.map(container, {
            center: [startLocation.lat, startLocation.lng],
            zoom: 12,
            zoomControl: true,
            attributionControl: true,
          });
          initializeMap(map, startLocation);
        }
      }, 500);
      return () => clearTimeout(retryTimer);
    }

    // Small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      if (!mapRef.current) return;
      
      // Double-check dimensions
      if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
        console.error('Map container still has no dimensions');
        return;
      }

      // Create map centered on Istanbul
      const map = L.map(mapRef.current, {
        center: [startLocation.lat, startLocation.lng],
        zoom: 12,
        zoomControl: true,
        attributionControl: true,
      });
      
      initializeMap(map, startLocation);
    }, 100);

    function initializeMap(map: L.Map, startLocation: { lat: number; lng: number }) {

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Create draggable marker
      const marker = L.marker([startLocation.lat, startLocation.lng], {
        draggable: true,
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

      markerRef.current = marker;

      // Add circle to show approximate area (not exact address)
      const circle = L.circle([startLocation.lat, startLocation.lng], {
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.1,
        radius: 2000, // 2km radius to show approximate area
      }).addTo(map);

      circleRef.current = circle;

      // Function to reverse geocode and get area name
      const updateLocation = async (lat: number, lng: number, isUserAction: boolean = false) => {
        try {
          // Use Nominatim (OpenStreetMap geocoding) to get area name
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'TheHiveApp/1.0',
              },
            }
          );
          const data = await response.json();
          
          // Extract area name from response
          let areaName = '';
          if (data.address) {
            // Try different address components
            areaName = 
              data.address.suburb || 
              data.address.neighbourhood || 
              data.address.quarter || 
              data.address.city_district ||
              data.address.town ||
              data.address.city ||
              'Istanbul';
          }

          setSelectedArea(areaName);
          // Only call callback if it's a user action (drag/click) or initial load
          if (isUserAction || !hasInitializedRef.current) {
            onLocationSelectRef.current({ lat, lng, area: areaName });
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          setSelectedArea('Istanbul');
          if (isUserAction || !hasInitializedRef.current) {
            onLocationSelectRef.current({ lat, lng, area: 'Istanbul' });
          }
        }
      };

      // Update location when marker is dragged
      marker.on('dragend', (e) => {
        const position = marker.getLatLng();
        circle.setLatLng(position);
        updateLocation(position.lat, position.lng, true);
      });

      // Update location when map is clicked
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        updateLocation(lat, lng, true);
      });

      // Initial location update (only once)
      updateLocation(startLocation.lat, startLocation.lng, false);
      hasInitializedRef.current = true;

      mapInstanceRef.current = map;
      
      // Force map to invalidate size after a brief delay to ensure it renders
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      clearTimeout(initTimer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error('Error removing map:', e);
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
        hasInitializedRef.current = false;
      }
    };
  }, [initialLocation]);

  return (
    <div className="w-full">
      <div 
        className="w-full rounded-lg border border-gray-300 overflow-hidden relative mb-3 bg-gray-100"
        style={{ height: '320px', minHeight: '320px' }}
      >
        <div 
          ref={mapRef} 
          className="w-full h-full"
          style={{ width: '100%', height: '100%', minHeight: '320px' }}
        />
        {!mapInstanceRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border border-gray-200 z-[1000]">
          <p className="text-xs text-gray-600 mb-1">Drag the pin to select location</p>
          {selectedArea && (
            <p className="text-sm font-medium text-gray-900">{selectedArea}</p>
          )}
        </div>
      </div>
      {required && !selectedArea && (
        <p className="text-xs text-red-500 mt-1">Please select a location on the map</p>
      )}
    </div>
  );
}

