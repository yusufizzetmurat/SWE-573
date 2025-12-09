import React from 'react';
import { BookOpen, CheckCircle, Users, Heart, Shield, AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface GuidelinesModalProps {
  open: boolean;
  onClose: () => void;
}

const GUIDELINES = [
  {
    icon: Heart,
    title: 'Be Respectful',
    items: [
      'Treat all members with kindness and respect',
      'No harassment, discrimination, or hate speech',
      'Disagree constructively and professionally',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Stay On Topic',
    items: [
      'Keep discussions relevant to the forum category',
      'Use appropriate categories for your posts',
      'Avoid spamming or off-topic content',
    ],
  },
  {
    icon: Users,
    title: 'Share Knowledge',
    items: [
      'Help others by sharing your expertise',
      'Ask questions when you need help',
      'Provide constructive feedback',
    ],
  },
  {
    icon: CheckCircle,
    title: 'Follow TimeBank Principles',
    items: [
      'Honor your commitments',
      'Communicate clearly about schedules',
      'Report issues through proper channels',
    ],
  },
  {
    icon: Shield,
    title: 'Privacy & Safety',
    items: [
      "Don't share personal information publicly",
      'Report suspicious behavior',
      "Respect others' privacy",
    ],
  },
  {
    icon: AlertCircle,
    title: 'Moderation',
    items: [
      'Admins may remove inappropriate content',
      'Repeated violations may result in warnings or bans',
      'Appeals can be made through support channels',
    ],
  },
];

export function GuidelinesModal({ open, onClose }: GuidelinesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="w-6 h-6 text-amber-500" />
            Community Guidelines
          </DialogTitle>
          <DialogDescription>
            Please read and follow these guidelines to help maintain a positive and welcoming community.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {GUIDELINES.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {index + 1}. {section.title}
                  </h3>
                </div>
                <ul className="space-y-2 ml-10">
                  {section.items.map((item, itemIndex) => (
                    <li 
                      key={itemIndex} 
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                    >
                      <span className="text-amber-500 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-center text-amber-800 dark:text-amber-200 font-medium">
            Thank you for helping maintain a positive community! 🌟
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

