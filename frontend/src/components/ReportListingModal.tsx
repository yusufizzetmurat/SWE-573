import React, { useState } from 'react';
import { Flag, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useToast } from './Toast';
import { serviceAPI } from '../lib/api';
import { getErrorMessage } from '../lib/types';

interface ReportListingModalProps {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  serviceTitle: string;
}

const REPORT_TYPES = [
  { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Offensive, harmful, or violates community guidelines' },
  { value: 'spam', label: 'Spam', description: 'Promotional content, scams, or misleading information' },
  { value: 'service_issue', label: 'Service Issue', description: 'Concerns about service quality or legitimacy' },
];

export function ReportListingModal({ open, onClose, serviceId, serviceTitle }: ReportListingModalProps) {
  const { showToast } = useToast();
  const [reportType, setReportType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportType) {
      showToast('Please select a report type', 'warning');
      return;
    }
    
    if (description.trim().length < 10) {
      showToast('Please provide a description of at least 10 characters', 'warning');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await serviceAPI.report(serviceId, reportType, description.trim());
      showToast('Report submitted successfully. Our team will review it shortly.', 'success');
      handleClose();
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to submit report');
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    setReportType('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Flag className="w-5 h-5" />
            Report Listing
          </DialogTitle>
          <DialogDescription>
            Report "{serviceTitle}" for review by our moderation team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                False reports may result in action against your account. Only report genuine issues.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 text-right">
              {description.length}/1000 characters
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-500 hover:bg-red-600"
              disabled={isSubmitting || !reportType || description.trim().length < 10}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

