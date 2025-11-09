import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Calendar, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './Toast';

interface HandshakeDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { exact_location: string; exact_duration: number; scheduled_time: string }) => Promise<void>;
  serviceTitle?: string;
}

export function HandshakeDetailsModal({ 
  open, 
  onClose,
  onSubmit,
  serviceTitle = 'Service'
}: HandshakeDetailsModalProps) {
  const [exactLocation, setExactLocation] = useState('');
  const [exactDuration, setExactDuration] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setExactLocation('');
      setExactDuration('');
      setScheduledDate('');
      setScheduledTime('');
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!exactLocation.trim() || !exactDuration || !scheduledDate || !scheduledTime || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Validate duration
      const duration = parseFloat(exactDuration);
      if (isNaN(duration) || duration <= 0) {
        setIsSubmitting(false);
        showToast('Duration must be a positive number', 'error');
        return;
      }
      
      // Format datetime as ISO 8601
      const scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`;
      
      // Validate that the selected time is in the future
      const selectedDate = new Date(scheduledDateTime);
      const now = new Date();
      
      if (selectedDate <= now) {
        setIsSubmitting(false);
        showToast('Scheduled time must be in the future. Please select a later date/time.', 'error');
        return;
      }
      
      await onSubmit({
        exact_location: exactLocation.trim(),
        exact_duration: duration,
        scheduled_time: scheduledDateTime
      });
      // On success, parent will close the modal (which triggers form reset via useEffect)
      // Don't reset isSubmitting here - let the modal close handle it
    } catch (error) {
      console.error('Failed to submit handshake details:', error);
      // Re-throw error so parent component can handle it
      // Modal stays open so user can fix and retry
      setIsSubmitting(false);
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Confirm Service Details
          </DialogTitle>
          <DialogDescription className="text-center pt-4 text-gray-600">
            Please provide exact location, duration, and scheduled time for "{serviceTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          <div>
            <Label htmlFor="exact-location" className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4" />
              Exact Location
            </Label>
            <Input
              id="exact-location"
              type="text"
              placeholder="e.g., 123 Main St, Room 5, or Zoom link"
              value={exactLocation}
              onChange={(e) => setExactLocation(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="exact-duration" className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" />
              Duration (Hours)
            </Label>
            <Input
              id="exact-duration"
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              placeholder="e.g., 2.0"
              value={exactDuration}
              onChange={(e) => setExactDuration(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="scheduled-date" className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              Scheduled Date & Time
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="scheduled-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              <Input
                id="scheduled-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Please select a date and time in the future
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleSubmit}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            disabled={isSubmitting || !exactLocation.trim() || !exactDuration || !scheduledDate || !scheduledTime}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Details'}
          </Button>
          <Button 
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

