import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // For demo, we'll use data URLs. In production, upload files to server first
      await userAPI.updateMe(formData);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              rows={4}
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
              <div className="mt-2">
                <img src={formData.avatar_url} alt="Avatar preview" className="w-20 h-20 rounded-full object-cover" />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Upload a profile picture (or enter URL below)
            </p>
            <Input
              type="url"
              placeholder="Or enter image URL"
              value={formData.avatar_url && !formData.avatar_url.startsWith('data:') ? formData.avatar_url : ''}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              className="mt-2"
            />
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
                <img src={formData.banner_url} alt="Banner preview" className="w-full h-32 rounded-lg object-cover" />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Upload a banner image (or enter URL below)
            </p>
            <Input
              type="url"
              placeholder="Or enter image URL"
              value={formData.banner_url && !formData.banner_url.startsWith('data:') ? formData.banner_url : ''}
              onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

