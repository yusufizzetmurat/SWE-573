import React, { useState } from 'react';
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

interface HandshakeDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { exact_location: string; exact_duration: number; scheduled_time: string }) => void;
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

  const handleSubmit = async () => {
    if (!exactLocation.trim() || !exactDuration || !scheduledDate || !scheduledTime) {
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`;
      await onSubmit({
        exact_location: exactLocation.trim(),
        exact_duration: parseFloat(exactDuration),
        scheduled_time: scheduledDateTime
      });
      onClose();
      setExactLocation('');
      setExactDuration('');
      setScheduledDate('');
      setScheduledTime('');
    } catch (error) {
      console.error('Failed to submit handshake details:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Confirm Service Details
          </DialogTitle>
          <DialogDescription className="text-center pt-4">
            <p className="text-gray-600">
              Please provide exact location, duration, and scheduled time for "{serviceTitle}"
            </p>
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

