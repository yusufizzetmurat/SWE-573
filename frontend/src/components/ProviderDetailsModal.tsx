import React from 'react';
import { MapPin, Clock, Calendar, X, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface ProviderDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  onRequestChanges?: () => void;
  onDecline?: () => void;
  exactLocation?: string;
  exactDuration?: number;
  scheduledTime?: string;
  serviceTitle?: string;
  providerName?: string;
}

export function ProviderDetailsModal({ 
  open, 
  onClose,
  onApprove,
  onRequestChanges,
  onDecline,
  exactLocation,
  exactDuration,
  scheduledTime,
  serviceTitle = 'Service',
  providerName = 'Provider'
}: ProviderDetailsModalProps) {
  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return 'Not specified';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateTimeString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Review Service Details
          </DialogTitle>
          <DialogDescription className="text-center pt-4 text-gray-600">
            {providerName} has provided the following details for "{serviceTitle}". Please review before approving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3 mb-3">
              <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-700 mb-1">Exact Location</div>
                <div className="text-gray-900">{exactLocation || 'Not specified'}</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3 mb-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-700 mb-1">Duration</div>
                <div className="text-gray-900">
                  {exactDuration ? `${exactDuration} ${exactDuration === 1 ? 'hour' : 'hours'}` : 'Not specified'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3 mb-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-700 mb-1">Scheduled Time</div>
                <div className="text-gray-900">{formatDateTime(scheduledTime)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={onApprove}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
            disabled={!exactLocation || !exactDuration || !scheduledTime}
          >
            Approve & Confirm
          </Button>
          
          <div className="flex gap-2">
            {onRequestChanges && (
              <Button 
                onClick={onRequestChanges}
                variant="outline"
                className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
            )}
            {onDecline && (
              <Button 
                onClick={onDecline}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Decline
              </Button>
            )}
          </div>
          
          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

