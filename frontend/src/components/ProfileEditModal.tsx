import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Video, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { userAPI, User } from '../lib/api';

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: () => void;
}

export function ProfileEditModal({ open, onClose, user, onUpdate }: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    bio: '',
    avatar_url: '',
    banner_url: '',
    first_name: '',
    last_name: '',
    video_intro_url: '',
    portfolio_images: [] as string[],
    show_history: true,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        banner_url: user.banner_url || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        video_intro_url: user.video_intro_url || '',
        portfolio_images: user.portfolio_images || [],
        show_history: user.show_history !== false, // Default to true
      });
    }
  }, [user]);

  const handleFileChange = (type: 'avatar' | 'banner', file: File | null) => {
    if (file) {
      // For demo, convert to data URL (in production, upload to server)
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (type === 'avatar') {
          setFormData({ ...formData, avatar_url: dataUrl });
          setAvatarFile(file);
        } else {
          setFormData({ ...formData, banner_url: dataUrl });
          setBannerFile(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePortfolioImageAdd = (file: File | null) => {
    if (file && formData.portfolio_images.length < 5) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setFormData({
          ...formData,
          portfolio_images: [...formData.portfolio_images, dataUrl]
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePortfolioImageRemove = (index: number) => {
    setFormData({
      ...formData,
      portfolio_images: formData.portfolio_images.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Filter out empty values to avoid validation errors
      // Always include name fields (required), include bio (can be empty), 
      // only include URLs if they have a value
      const updateData: Record<string, unknown> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        bio: formData.bio || '', // Allow empty bio
        show_history: formData.show_history,
        portfolio_images: formData.portfolio_images,
      };
      
      // Only include URLs if they're not empty (to avoid validation errors)
      if (formData.avatar_url) updateData.avatar_url = formData.avatar_url;
      if (formData.banner_url) updateData.banner_url = formData.banner_url;
      if (formData.video_intro_url) updateData.video_intro_url = formData.video_intro_url;

      await userAPI.updateMe(updateData);
      onUpdate();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to update profile:', err);
      const { getErrorMessage } = await import('../lib/types');
      const errorMessage = getErrorMessage(err, 'Failed to update profile');
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ minHeight: 0 }}>
          <div className="space-y-6 pb-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="avatar">Profile Picture</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('avatar', e.target.files?.[0] || null)}
                className="mt-2"
              />
              {formData.avatar_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={formData.avatar_url} alt="Avatar preview" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                  <span className="text-xs text-green-600">✓ Uploaded</span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="banner">Banner Image</Label>
              <Input
                id="banner"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('banner', e.target.files?.[0] || null)}
                className="mt-2"
              />
              {formData.banner_url && (
                <div className="mt-2">
                  <img src={formData.banner_url} alt="Banner preview" className="w-full h-20 rounded object-cover border-2 border-gray-200" />
                  <span className="text-xs text-green-600 mt-1 inline-block">✓ Uploaded</span>
                </div>
              )}
            </div>

            {/* Video Intro Section */}
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Video className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Video Introduction</h3>
              </div>
              
              <div>
                <Label htmlFor="video_intro_url">Video URL (YouTube or Vimeo)</Label>
                <Input
                  id="video_intro_url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.video_intro_url}
                  onChange={(e) => setFormData({ ...formData, video_intro_url: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste a YouTube or Vimeo link to introduce yourself to the community
                </p>
              </div>
            </div>

            {/* Portfolio Images Section */}
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Portfolio Images</h3>
                <span className="text-xs text-gray-500">({formData.portfolio_images.length}/5)</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {formData.portfolio_images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={img} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handlePortfolioImageRemove(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {formData.portfolio_images.length < 5 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
                    <Plus className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Add Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePortfolioImageAdd(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Upload up to 5 images showcasing your work or skills
              </p>
            </div>

            {/* Privacy Settings Section */}
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                {formData.show_history ? (
                  <Eye className="w-5 h-5 text-amber-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
                <h3 className="font-semibold text-gray-900">Privacy Settings</h3>
              </div>

              <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.show_history}
                  onChange={(e) => setFormData({ ...formData, show_history: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Show Transaction History</p>
                  <p className="text-xs text-gray-500">
                    Allow other users to see your completed exchanges on your public profile
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 bg-white border-t px-6 py-4">
          <form onSubmit={handleSubmit} className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
