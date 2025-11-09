import React from 'react';
import { MapPin, Clock, Users, Tag as TagIcon } from 'lucide-react';
import { Service } from '../lib/api';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

interface ServiceCardProps {
  service: Service;
  onClick?: (service: Service) => void;
}

/**
 * Memoized service card component to prevent unnecessary re-renders
 * Only re-renders when service data changes
 */
export const ServiceCard = React.memo<ServiceCardProps>(
  ({ service, onClick }) => {
    const user = typeof service.user === 'object' ? service.user : null;

    return (
      <div
        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer border border-gray-200"
        onClick={() => onClick?.(service)}
      >
        {/* Header with user info */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url} alt={user?.first_name} />
            <AvatarFallback>
              {user?.first_name?.[0]}
              {user?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-500">
              {service.type === 'Offer' ? 'Offering' : 'Seeking'}
            </p>
          </div>
        </div>

        {/* Service title and description */}
        <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {service.description}
        </p>

        {/* Service details */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{service.duration}h</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{service.location_type}</span>
          </div>
          {service.location_area && (
            <div className="flex items-center gap-1">
              <span>{service.location_area}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{service.max_participants} max</span>
          </div>
        </div>

        {/* Tags */}
        {service.tags && service.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {service.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                <TagIcon className="h-3 w-3 mr-1" />
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function
    // Only re-render if service data actually changed
    return (
      prevProps.service.id === nextProps.service.id &&
      prevProps.service.title === nextProps.service.title &&
      prevProps.service.description === nextProps.service.description &&
      prevProps.service.status === nextProps.service.status &&
      prevProps.service.updated_at === nextProps.service.updated_at
    );
  }
);

ServiceCard.displayName = 'ServiceCard';
