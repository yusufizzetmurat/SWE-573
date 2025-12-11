import React, { useEffect } from 'react';
import { Service, serviceAPI } from '../lib/api';
import { useApiCall } from '../lib/hooks/useApiCall';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface ServiceListProps {
  onServiceClick?: (service: Service) => void;
}

/**
 * Example component demonstrating useApiCall hook usage
 * Shows loading spinner, error handling, and data display
 */
export function ServiceList({ onServiceClick }: ServiceListProps) {
  const { data: services, loading, error, execute } = useApiCall(serviceAPI.list, {
    initialData: [],
    onError: (error) => {
      logger.error('Failed to load services', error instanceof Error ? error : new Error(String(error)));
    },
  });

  useEffect(() => {
    // Fetch services on mount
    execute({});
  }, [execute]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Loading services...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No services available
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {services.map((service) => (
        <div
          key={service.id}
          className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onServiceClick?.(service)}
        >
          <h3 className="font-semibold text-lg">{service.title}</h3>
          <p className="text-gray-600 mt-1">{service.description}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-sm text-gray-500">{service.type}</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">{service.duration}h</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">{service.location_type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
