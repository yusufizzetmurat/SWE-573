import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, AlertTriangle, X, Edit2 } from 'lucide-react';
import { formatTimebank } from '../lib/utils';
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
import { handshakeAPI, type Handshake } from '../lib/api';

interface ServiceConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (hours?: number) => void;
  onReportNoShow: () => void;
  handshakeId?: string | null;
  serviceTitle?: string;
  providerName?: string;
  receiverName?: string;
  duration?: number;
}

export function ServiceConfirmationModal({ 
  open, 
  onClose,
  onComplete,
  onReportNoShow,
  handshakeId,
  serviceTitle,
  providerName,
  receiverName,
  duration: initialDuration,
}: ServiceConfirmationModalProps) {
  const [showIssueOptions, setShowIssueOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [handshake, setHandshake] = useState<Handshake | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hours, setHours] = useState<string>('');
  const [isEditingHours, setIsEditingHours] = useState(false);

  useEffect(() => {
    if (open && handshakeId) {
      const fetchHandshake = () => {
        handshakeAPI.get(handshakeId)
          .then((data) => {
            setHandshake(data);
            // Only update hours if user is not currently editing
            if (!isEditingHours) {
              setHours(data.provisioned_hours.toString());
            }
          })
          .catch((error) => {
            console.error('Failed to fetch handshake:', error);
          });
      };

      setIsLoading(true);
      fetchHandshake();
      setIsLoading(false);
      
      // Refresh handshake data periodically to catch hour changes from other user
      const refreshInterval = setInterval(fetchHandshake, 3000);
      
      return () => clearInterval(refreshInterval);
    } else if (open && initialDuration) {
      setHours(initialDuration.toString());
    }
  }, [open, handshakeId, initialDuration, isEditingHours]);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const hoursValue = parseFloat(hours) || (handshake?.provisioned_hours ?? initialDuration ?? 0);
      await onComplete(hoursValue);
      onClose();
    } catch (error) {
      console.error('Failed to complete service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const actualDuration = handshake?.provisioned_hours ?? (parseFloat(hours) || initialDuration || 0);
  const displayTitle = handshake?.service_title || serviceTitle || 'Service';
  const displayProviderName = handshake?.provider_name || providerName || 'Provider';
  const displayReceiverName = handshake?.requester_name || receiverName || 'Receiver';

  const handleReportIssue = () => {
    setShowIssueOptions(true);
  };

  const handleNoShow = () => {
    onReportNoShow();
    setShowIssueOptions(false);
    onClose();
  };

  const handleBack = () => {
    setShowIssueOptions(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {!showIssueOptions ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">
                Confirm Service Outcome
              </DialogTitle>
              <DialogDescription className="text-center pt-4">
                <p className="text-gray-600">
                  Please confirm the outcome of this service
                </p>
              </DialogDescription>
            </DialogHeader>

            {/* Service Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
              {isLoading ? (
                <div className="text-center py-4 text-gray-600">Loading service details...</div>
              ) : (
                <>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Service</div>
                    <div className="text-gray-900">{displayTitle}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div>
                      <div className="text-sm text-gray-600">Provider</div>
                      <div className="text-gray-900">{displayProviderName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Receiver</div>
                      <div className="text-gray-900">{displayReceiverName}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hours-input" className="text-gray-600">Duration (TimeBank Hours)</Label>
                      {isEditingHours ? (
                        <div className="flex items-center gap-2">
                          <Input
                            id="hours-input"
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="24"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            className="w-20"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsEditingHours(false);
                              const parsed = parseFloat(hours);
                              if (isNaN(parsed) || parsed <= 0) {
                                setHours(actualDuration.toString());
                              }
                            }}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900">
                              {formatTimebank(actualDuration)} TimeBank {formatTimebank(actualDuration) === '1' ? 'Hour' : 'Hours'}
                            </span>
                            <button
                              onClick={() => setIsEditingHours(true)}
                              className="text-amber-600 hover:text-amber-700"
                              title="Edit hours"
                            >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleComplete}
                className="w-full bg-green-500 hover:bg-green-600 text-white h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Confirming...'
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Service Completed Successfully
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleReportIssue}
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 h-12"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Report an Issue
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">
                Report an Issue
              </DialogTitle>
              <DialogDescription className="text-center pt-4">
                <p className="text-gray-600">
                  Please select the issue you experienced
                </p>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-6">
              <button
                onClick={handleNoShow}
                className="w-full p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="text-gray-900 mb-1">My partner did not show up</div>
                    <div className="text-sm text-gray-600">
                      This will be reviewed by our admin team
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  // Handle "Other" issue - could navigate to contact admin
                  onClose();
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-gray-900 mb-1">Other (Contact Admin)</div>
                    <div className="text-sm text-gray-600">
                      For other issues that need admin attention
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <Button 
              onClick={handleBack}
              variant="outline"
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
