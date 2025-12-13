import React from 'react';
import { Hexagon, PartyPopper, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  startingBalanceHours?: number;
  onNavigate?: (page: string) => void;
}

export function WelcomeModal({ open, onClose, userName, startingBalanceHours = 3, onNavigate }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Hexagon className="w-10 h-10 fill-white text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <PartyPopper className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Welcome to The Hive, {userName}!
          </DialogTitle>
          <div className="text-center pt-4">
            <div className="bg-amber-50 rounded-lg p-6 border border-amber-100">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Clock className="w-6 h-6 text-amber-600" />
                <span className="text-2xl text-amber-900">
                  {startingBalanceHours} TimeBank {startingBalanceHours === 1 ? 'Hour' : 'Hours'}
                </span>
              </div>
              <div className="text-sm text-amber-700">
                Your starting balance has been credited
              </div>
            </div>
            <div className="text-gray-600 mt-6">
              You're all set to start sharing time and skills with your community. 
              Browse available services or post your first offer to get started!
            </div>
          </div>
        </DialogHeader>
        <div className="flex gap-3 mt-2">
          <Button 
            variant="outline" 
            onClick={() => {
              onClose();
              onNavigate?.('dashboard');
            }}
            className="flex-1"
          >
            Browse Services
          </Button>
          <Button 
            onClick={() => {
              onClose();
              onNavigate?.('post-offer');
            }}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
          >
            Post a Service
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
