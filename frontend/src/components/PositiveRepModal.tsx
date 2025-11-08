import React, { useState } from 'react';
import { Heart, Clock, Sparkles, ThumbsUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface PositiveRepModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reps: { punctual: boolean; helpful: boolean; kind: boolean }) => void;
  userName?: string;
}

export function PositiveRepModal({ 
  open, 
  onClose,
  onSubmit,
  userName = 'Your Partner',
}: PositiveRepModalProps) {
  const [selectedReps, setSelectedReps] = useState({
    punctual: false,
    helpful: false,
    kind: false,
  });

  const toggleRep = (rep: 'punctual' | 'helpful' | 'kind') => {
    setSelectedReps(prev => ({
      ...prev,
      [rep]: !prev[rep],
    }));
  };

  const handleSubmit = () => {
    onSubmit(selectedReps);
    onClose();
    // Reset for next time
    setSelectedReps({ punctual: false, helpful: false, kind: false });
  };

  const handleSkip = () => {
    onClose();
    setSelectedReps({ punctual: false, helpful: false, kind: false });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <ThumbsUp className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Great! Would you like to recommend {userName}?
          </DialogTitle>
          <DialogDescription className="text-center pt-4">
            <p className="text-gray-600">
              Help build community trust by highlighting what went well. (This is optional and always positive)
            </p>
          </DialogDescription>
        </DialogHeader>

        {/* Positive Rep Buttons */}
        <div className="space-y-3 my-6">
          <button
            onClick={() => toggleRep('punctual')}
            className={`w-full p-4 border-2 rounded-lg transition-all ${
              selectedReps.punctual
                ? 'bg-green-50 border-green-500 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedReps.punctual ? 'bg-green-500' : 'bg-gray-200'
              }`}>
                <Clock className={`w-5 h-5 ${selectedReps.punctual ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-gray-900">+ Punctual</div>
                <div className="text-sm text-gray-600">Arrived on time and ready</div>
              </div>
              {selectedReps.punctual && (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => toggleRep('helpful')}
            className={`w-full p-4 border-2 rounded-lg transition-all ${
              selectedReps.helpful
                ? 'bg-blue-50 border-blue-500 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedReps.helpful ? 'bg-blue-500' : 'bg-gray-200'
              }`}>
                <Sparkles className={`w-5 h-5 ${selectedReps.helpful ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-gray-900">+ Helpful</div>
                <div className="text-sm text-gray-600">Went above and beyond</div>
              </div>
              {selectedReps.helpful && (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => toggleRep('kind')}
            className={`w-full p-4 border-2 rounded-lg transition-all ${
              selectedReps.kind
                ? 'bg-pink-50 border-pink-500 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedReps.kind ? 'bg-pink-500' : 'bg-gray-200'
              }`}>
                <Heart className={`w-5 h-5 ${selectedReps.kind ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-gray-900">+ Kind</div>
                <div className="text-sm text-gray-600">Friendly and respectful</div>
              </div>
              {selectedReps.kind && (
                <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {!selectedReps.punctual && !selectedReps.helpful && !selectedReps.kind && (
            <p className="text-xs text-gray-500 text-center mb-1">
              Select at least one recommendation to submit
            </p>
          )}
          <Button 
            onClick={handleSubmit}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            disabled={!selectedReps.punctual && !selectedReps.helpful && !selectedReps.kind}
          >
            Submit Reps
          </Button>
          
          <button
            onClick={handleSkip}
            className="w-full text-gray-600 hover:text-gray-900 py-2 text-sm"
          >
            Skip
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
