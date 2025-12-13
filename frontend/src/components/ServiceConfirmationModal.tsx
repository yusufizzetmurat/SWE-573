import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, User, AlertTriangle, X, Edit2 } from 'lucide-react';
import { formatTimebank } from '../lib/utils';
import { POLLING_INTERVALS } from '../lib/constants';
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
import { logger } from '../lib/logger';

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
  const isEditingHoursRef = useRef(isEditingHours);
  const hasLoadedHandshakeRef = useRef(false);

  useEffect(() => {
    isEditingHoursRef.current = isEditingHours;
  }, [isEditingHours]);

  useEffect(() => {
    if (open && handshakeId) {
      let isActive = true;

      // Reset state when opening a different handshake.
      hasLoadedHandshakeRef.current = false;
      setHandshake(null);
      setIsLoading(true);

      const fetchHandshake = async () => {
        try {
          // Only show the loading state for the initial load;
          // avoid UI flicker during background polling refreshes.
          if (!hasLoadedHandshakeRef.current) {
            setIsLoading(true);
          }
          const data = await handshakeAPI.get(handshakeId);
          if (!isActive) return;
          setHandshake(data);
          hasLoadedHandshakeRef.current = true;
          if (!isEditingHoursRef.current) {
            setHours(data.provisioned_hours.toString());
          }
        } catch (error) {
          logger.error('Failed to fetch handshake', error instanceof Error ? error : new Error(String(error)), { handshakeId });
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      fetchHandshake();
      
      // Refresh handshake data periodically to catch hour changes from other user
      const refreshInterval = setInterval(fetchHandshake, POLLING_INTERVALS.HANDSHAKE);
      
      return () => {
        isActive = false;
        clearInterval(refreshInterval);
      };
    } else if (open && initialDuration) {
      setHours(initialDuration.toString());
    }
  }, [open, handshakeId, initialDuration]);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const hoursValue = parseFloat(hours) || (handshake?.provisioned_hours ?? initialDuration ?? 0);
      await onComplete(hoursValue);
      onClose();
    } catch (error) {
      logger.error('Failed to complete service', error instanceof Error ? error : new Error(String(error)), { handshakeId });
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        {!showIssueOptions ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">
                Confirm Service Outcome
              </DialogTitle>
              <DialogDescription className="text-center pt-4 text-gray-600">
                Please confirm the outcome of this service
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
                            <span className="text-gray-900 font-medium">
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
                          {handshake && (
                            <p className="text-xs text-gray-500">
                              Hours can be adjusted before both parties confirm
                            </p>
                          )}
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
              <DialogDescription className="text-center pt-4 text-gray-600">
                Please select the issue you experienced
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-6">
              <button
                onClick={handleNoShow}
                className="w-full p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Report that my partner did not show up"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" aria-hidden="true" />
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
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-label="Report other issue and contact admin"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-gray-600 mt-0.5" aria-hidden="true" />
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
