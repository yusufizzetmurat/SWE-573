import React, { useState } from 'react';
import { AlertTriangle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { type Report } from '../lib/api';

interface DisputeResolutionModalProps {
  report: Report;
  onConfirm: (action: 'confirm_no_show' | 'dismiss', notes?: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function DisputeResolutionModal({ 
  report, 
  onConfirm, 
  onCancel, 
  isLoading 
}: DisputeResolutionModalProps) {
  const [notes, setNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'confirm_no_show' | 'dismiss' | null>(null);

  const hours = report.handshake_hours || 0;
  const reporterName = report.reporter_name || 'Reporter';
  const reportedName = report.reported_user_name || 'Reported User';
  
  // Determine the financial action based on who no-showed
  // If receiver no-showed: complete transfer (pay provider)
  // If provider no-showed: cancel transfer (refund receiver)
  const isReceiverNoShow = report.reported_user_is_receiver === true;

  const handleConfirm = () => {
    if (selectedAction) {
      onConfirm(selectedAction, notes || undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-100 p-6 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Resolve TimeBank Dispute</h2>
              <p className="text-sm text-gray-600">No-Show Report</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Transaction Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Transaction Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Hours at stake:</span>
                <span className="font-semibold text-amber-600">{hours} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reporter:</span>
                <span className="font-medium">{reporterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reported User:</span>
                <span className="font-medium">{reportedName}</span>
              </div>
              {report.handshake_scheduled_time && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Scheduled Time:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(report.handshake_scheduled_time).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Select Resolution</h3>
            
            {/* Confirm No-Show Option */}
            <button
              onClick={() => setSelectedAction('confirm_no_show')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                selectedAction === 'confirm_no_show'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  selectedAction === 'confirm_no_show'
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300'
                }`}>
                  {selectedAction === 'confirm_no_show' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Confirm No-Show</div>
                  <div className="text-sm text-gray-600 mt-1">
                    The reported user did not show up for the service.
                  </div>
                  <div className="mt-3 p-3 bg-red-100/50 rounded-lg text-sm">
                    <div className="font-medium text-red-800 mb-2">This action will:</div>
                    <ul className="space-y-1 text-red-700">
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        {isReceiverNoShow ? (
                          <>Transfer <strong>{hours} hours</strong> to the provider (who showed up)</>
                        ) : (
                          <>Refund <strong>{hours} hours</strong> to the receiver (who showed up)</>
                        )}
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        Deduct <strong>5 Karma</strong> from {reportedName}
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        {isReceiverNoShow ? 'Complete the handshake' : 'Cancel the handshake'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </button>

            {/* Dismiss Option */}
            <button
              onClick={() => setSelectedAction('dismiss')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                selectedAction === 'dismiss'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  selectedAction === 'dismiss'
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300'
                }`}>
                  {selectedAction === 'dismiss' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Dismiss Report</div>
                  <div className="text-sm text-gray-600 mt-1">
                    The report is unfounded; complete the service normally.
                  </div>
                  <div className="mt-3 p-3 bg-green-100/50 rounded-lg text-sm">
                    <div className="font-medium text-green-800 mb-2">This action will:</div>
                    <ul className="space-y-1 text-green-700">
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        Transfer <strong>{hours} hours</strong> to the provider
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        Mark the handshake as completed
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        Dismiss the report
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Admin Notes */}
          <div>
            <label htmlFor="admin-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Notes (Optional)
            </label>
            <textarea
              id="admin-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this resolution..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedAction || isLoading}
            className={
              selectedAction === 'confirm_no_show'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : selectedAction === 'dismiss'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-400 text-white'
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Resolution'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
