import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { forumAPI } from '../lib/api';
import type { ForumCategory } from '../lib/types';
import { useToast } from './Toast';
import { logger } from '../lib/logger';
import { useAuth } from '../lib/auth-context';
import { getErrorMessage } from '../lib/types';

interface ForumCreateTopicProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  categorySlug?: string;
  categoryName?: string;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
}

export function ForumCreateTopic({ 
  onNavigate, 
  categorySlug,
  categoryName,
  userBalance = 0, 
  unreadNotifications = 0, 
  onLogout = () => {}
}: ForumCreateTopicProps) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; body?: string; category?: string }>({});

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);
      const data = await forumAPI.getCategories();
      setCategories(data);
      
      // If categorySlug is provided, find and select it
      if (categorySlug) {
        const category = data.find(c => c.slug === categorySlug);
        if (category) {
          setSelectedCategoryId(category.id);
        }
      }
    } catch (err) {
      logger.error('Failed to fetch categories', err instanceof Error ? err : new Error(String(err)));
      showToast('Failed to load categories', 'error');
    } finally {
      setIsLoadingCategories(false);
    }
  }, [categorySlug, showToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      showToast('Please log in to create a topic', 'info');
      onNavigate('login');
    }
  }, [isAuthenticated, onNavigate, showToast]);

  const validateForm = (): boolean => {
    const newErrors: { title?: string; body?: string; category?: string } = {};
    
    if (!selectedCategoryId) {
      newErrors.category = 'Please select a category';
    }
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }
    
    if (!body.trim()) {
      newErrors.body = 'Content is required';
    } else if (body.trim().length < 10) {
      newErrors.body = 'Content must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const newTopic = await forumAPI.createTopic({
        category: selectedCategoryId,
        title: title.trim(),
        body: body.trim()
      });
      
      showToast('Topic created successfully!', 'success');
      onNavigate('forum-topic', { topicId: newTopic.id, topicTitle: newTopic.title });
    } catch (err) {
      logger.error('Failed to create topic', err instanceof Error ? err : new Error(String(err)), { categorySlug });
      const errorMessage = getErrorMessage(err, 'Failed to create topic. Please try again.');
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (categorySlug) {
      onNavigate('forum-category', { categorySlug, categoryName });
    } else {
      onNavigate('forum');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="forum" 
        userBalance={userBalance}
        unreadNotifications={unreadNotifications}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={isAuthenticated}
      />

      <div className="max-w-[800px] mx-auto px-8 py-8">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="mb-6 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {categoryName || 'Forum'}
        </Button>

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Topic</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              {isLoadingCategories ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading categories...
                </div>
              ) : (
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setErrors(prev => ({ ...prev, category: undefined }));
                  }}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a category...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.category && (
                <p className="mt-1 text-sm text-red-500">{errors.category}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors(prev => ({ ...prev, title: undefined }));
                }}
                placeholder="Enter a descriptive title for your topic"
                className={errors.title ? 'border-red-500' : ''}
                maxLength={200}
              />
              <div className="flex justify-between mt-1">
                {errors.title ? (
                  <p className="text-sm text-red-500">{errors.title}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Give your topic a clear, descriptive title
                  </p>
                )}
                <span className="text-sm text-gray-400">{title.length}/200</span>
              </div>
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setErrors(prev => ({ ...prev, body: undefined }));
                }}
                placeholder="Share your thoughts, questions, or ideas..."
                className={`w-full p-4 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none ${
                  errors.body ? 'border-red-500' : 'border-gray-300'
                }`}
                rows={10}
                maxLength={10000}
              />
              <div className="flex justify-between mt-1">
                {errors.body ? (
                  <p className="text-sm text-red-500">{errors.body}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Provide details to help others understand and engage with your topic
                  </p>
                )}
                <span className="text-sm text-gray-400">{body.length}/10000</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Topic'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
