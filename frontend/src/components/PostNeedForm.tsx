import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { WikidataAutocomplete } from './WikidataAutocomplete';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { serviceAPI, tagAPI, Tag } from '../lib/api';
import { useToast } from './Toast';
import { LocationPickerMap } from './LocationPickerMap';

interface PostNeedFormProps {
  onNavigate: (page: string, data?: any) => void;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
  serviceData?: any; // Pre-filled service data for reposting
}

export function PostNeedForm({ onNavigate, userBalance = 1, unreadNotifications = 2, onLogout, serviceData }: PostNeedFormProps) {
  const { showToast } = useToast();
  const [scheduleType, setScheduleType] = useState<'one-time' | 'recurrent'>('one-time');
  const [tags, setTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'biweekly'>('weekly');
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringTime, setRecurringTime] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '1',
    max_participants: '1',
    location_type: 'In-Person',
    location_area: '',
    location_lat: '',
    location_lng: '',
    schedule_details: '',
  });
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; area?: string } | null>(null);
  const [serviceImages, setServiceImages] = useState<string[]>([]);
  
  const handleImageAdd = (file: File | null) => {
    if (file && serviceImages.length < 5) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setServiceImages([...serviceImages, dataUrl]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = (index: number) => {
    setServiceImages(serviceImages.filter((_, i) => i !== index));
  };

  // Memoize location select callback to prevent re-renders
  const handleLocationSelect = useCallback((location: { lat: number; lng: number; area?: string }) => {
    setSelectedLocation(location);
    setFormData((prev) => ({
      ...prev,
      location_area: location.area || '',
      location_lat: location.lat.toString(),
      location_lng: location.lng.toString(),
    }));
  }, []);

  useEffect(() => {
    if (serviceData) {
      setFormData({
        title: serviceData.title || '',
        description: serviceData.description || '',
        duration: serviceData.duration?.toString() || '1',
        max_participants: serviceData.max_participants?.toString() || '1',
        location_type: serviceData.location_type || 'In-Person',
        location_area: serviceData.location_area || '',
        location_lat: '',
        location_lng: '',
        schedule_details: serviceData.schedule_details || '',
      });
      
      if (serviceData.schedule_type) {
        setScheduleType(serviceData.schedule_type === 'One-Time' ? 'one-time' : 'recurrent');
      }
      
      if (serviceData.tags && Array.isArray(serviceData.tags)) {
        setTags(serviceData.tags);
      }
    }
  }, [serviceData]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await tagAPI.list();
        setAvailableTags(data);
        if (data.length === 0) {
          const mockTags: Tag[] = [
            { id: 'cooking', name: 'Cooking' },
            { id: 'music', name: 'Music' },
            { id: 'sports', name: 'Sports' },
            { id: 'art', name: 'Art' },
            { id: 'language', name: 'Language' },
            { id: 'gardening', name: 'Gardening' },
            { id: 'technology', name: 'Technology' },
            { id: 'education', name: 'Education' },
            { id: 'fitness', name: 'Fitness' },
            { id: 'crafts', name: 'Crafts' },
          ];
          setAvailableTags(mockTags);
        }
      } catch (err) {
        console.error('Failed to fetch tags:', err);
        const mockTags: Tag[] = [
          { id: 'cooking', name: 'Cooking' },
          { id: 'music', name: 'Music' },
          { id: 'sports', name: 'Sports' },
          { id: 'art', name: 'Art' },
          { id: 'language', name: 'Language' },
        ];
        setAvailableTags(mockTags);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    if (formData.location_type === 'In-Person' && navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationLoading(false);
        }
      );
    }
  }, [formData.location_type]);

  const removeTag = (tagToRemove: Tag) => {
    setTags(tags.filter(tag => tag.id !== tagToRemove.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let scheduleDetails = formData.schedule_details;
      if (scheduleType === 'one-time' && selectedDate && selectedTime) {
        const formattedDate = format(selectedDate, 'MMM d, yyyy');
        scheduleDetails = `${formattedDate} at ${selectedTime}`;
      } else if (scheduleType === 'one-time' && (!selectedDate || !selectedTime)) {
        showToast('Please select both date and time for one-time wants', 'warning');
        setIsSubmitting(false);
        return;
      } else if (scheduleType === 'recurrent') {
        if ((recurringFrequency === 'weekly' || recurringFrequency === 'biweekly') && recurringDays.length > 0 && recurringTime) {
          const prefix = recurringFrequency === 'biweekly' ? 'Every other' : 'Every';
          scheduleDetails = `${prefix} ${recurringDays.join(', ')} at ${recurringTime}`;
        } else if (recurringFrequency === 'daily' && recurringTime) {
          scheduleDetails = `Daily at ${recurringTime}`;
        } else if (!scheduleDetails) {
          showToast('Please configure recurring schedule', 'warning');
          setIsSubmitting(false);
          return;
        }
      }

      // Validate location for In-Person services
      if (formData.location_type === 'In-Person' && !selectedLocation) {
        showToast('Please select a location on the map', 'warning');
        setIsSubmitting(false);
        return;
      }

      // Separate tags into existing (by ID) and new (by name)
      const existingTagIds: string[] = [];
      const newTagNames: string[] = [];
      
      tags.forEach(tag => {
        // Check if tag has a UUID format (existing tag) or Wikidata QID (e.g., Q28865)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tag.id);
        const isWikidataQID = /^Q\d+$/i.test(tag.id);
        if (isUUID || isWikidataQID) {
          existingTagIds.push(tag.id);
        } else {
          newTagNames.push(tag.name);
        }
      });
      
      await serviceAPI.create({
        title: formData.title,
        description: formData.description,
        type: 'Need',
        duration: parseFloat(formData.duration),
        location_type: formData.location_type as 'In-Person' | 'Online',
        location_area: formData.location_type === 'In-Person' ? formData.location_area : undefined,
        location_lat: formData.location_type === 'In-Person' && selectedLocation ? Number(selectedLocation.lat.toFixed(6)) : undefined,
        location_lng: formData.location_type === 'In-Person' && selectedLocation ? Number(selectedLocation.lng.toFixed(6)) : undefined,
        max_participants: parseInt(formData.max_participants),
        schedule_type: scheduleType === 'one-time' ? 'One-Time' : 'Recurrent',
        schedule_details: scheduleDetails,
        tags: existingTagIds.length > 0 ? existingTagIds : undefined,
        tag_names: newTagNames.length > 0 ? newTagNames : undefined,
        media: serviceImages.length > 0 ? serviceImages : undefined,
      });

      showToast('Service want published successfully!', 'success');
      onNavigate('dashboard');
    } catch (error: unknown) {
      console.error('Failed to create service:', error);
      const { getErrorMessage } = await import('../lib/types');
      const errorMessage = getErrorMessage(error, 'Failed to create service');
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="browse" 
        userBalance={userBalance}
        unreadNotifications={unreadNotifications}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={true}
      />

      <div className="max-w-[800px] mx-auto px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => onNavigate('dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="mb-8">
            <h1 className="text-gray-900 mb-2">Post a Service Want</h1>
            <p className="text-gray-600">
              Request help or services from your community
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Want Title */}
            <div>
              <Label htmlFor="title">Service Want Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Moving Help Wanted"
                className="mt-2"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Be specific about what you're looking for
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what you want help with, any specific requirements, and what the helper should expect..."
                className="mt-2 min-h-[180px]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Provide clear details to help others understand your request
              </p>
            </div>

            {/* Service Photos */}
            <div>
              <Label>Service Photos (Optional)</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                Upload up to 5 photos to showcase your need ({serviceImages.length}/5)
              </p>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {serviceImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={img} alt={`Service photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleImageRemove(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {serviceImages.length < 5 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageAdd(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="duration">Estimated Duration (Hours) *</Label>
                <Select 
                  required
                  value={formData.duration}
                  onValueChange={(value) => setFormData({ ...formData, duration: value })}
                >
                  <SelectTrigger id="duration" className="mt-2">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="helpers">Number of Helpers Needed *</Label>
                <Input
                  id="helpers"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="e.g., 2"
                  className="mt-2"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Location Type */}
            <div>
              <Label htmlFor="location_type">Location Type *</Label>
              <Select 
                required
                value={formData.location_type}
                onValueChange={(value) => setFormData({ ...formData, location_type: value })}
              >
                <SelectTrigger id="location_type" className="mt-2">
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In-Person">In-Person</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Area (for In-Person services) */}
            {formData.location_type === 'In-Person' && (
              <div>
                <Label>Select Approximate Location Area *</Label>
                <p className="text-sm text-gray-600 mt-1 mb-3">
                  Move the pin on the map to select your approximate location area. Only the general area will be shown publicly. 
                  You can share the exact address through chat after handshake.
                </p>
                <div className="mt-2">
                  {locationLoading && (
                    <div className="mb-2 text-sm text-gray-600 flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></span>
                      Getting your location...
                    </div>
                  )}
                  <LocationPickerMap
                    onLocationSelect={handleLocationSelect}
                    required
                  />
                  {selectedLocation?.area && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Selected: {selectedLocation.area}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Schedule Type */}
            <div>
              <Label htmlFor="schedule-type">When Do You Want This? *</Label>
              <RadioGroup 
                value={scheduleType} 
                onValueChange={(value) => setScheduleType(value as 'one-time' | 'recurrent')}
                className="mt-2"
                id="schedule-type"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one-time" id="one-time" />
                  <Label htmlFor="one-time" className="cursor-pointer">
                    Specific Date/Time
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurrent" id="recurrent" />
                  <Label htmlFor="recurrent" className="cursor-pointer">
                    Flexible/Recurring
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Schedule Details */}
            {scheduleType === 'one-time' ? (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <Label className="text-gray-900 font-semibold">When Do You Want This? *</Label>
                <div className="mt-3 space-y-3">
                  {/* Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white hover:bg-blue-50 border-blue-300 hover:border-blue-400 transition-all duration-200"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                        {selectedDate ? (
                          format(selectedDate, 'PPP')
                        ) : (
                          <span className="text-gray-500">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                        className="rounded-lg border-0"
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Time Picker - Classic Selector */}
                  <div>
                    <Label htmlFor="one-time-time" className="text-sm font-medium text-gray-700 mb-2 block">
                      Select Time
                    </Label>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div className="flex items-center gap-2 flex-1">
                        <Select 
                          value={selectedTime ? selectedTime.split(':')[0] : ''} 
                          onValueChange={(hour) => {
                            const minutes = selectedTime ? selectedTime.split(':')[1] || '00' : '00';
                            setSelectedTime(`${hour.padStart(2, '0')}:${minutes}`);
                          }}
                        >
                          <SelectTrigger className="w-24 bg-white border-blue-300">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i.toString().padStart(2, '0');
                              const displayHour = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
                              return (
                                <SelectItem key={hour} value={hour}>
                                  {displayHour}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <span className="text-gray-500">:</span>
                        <Select 
                          value={selectedTime ? selectedTime.split(':')[1] || '00' : ''} 
                          onValueChange={(minute) => {
                            const hour = selectedTime ? selectedTime.split(':')[0] || '00' : '00';
                            setSelectedTime(`${hour}:${minute}`);
                          }}
                        >
                          <SelectTrigger className="w-24 bg-white border-blue-300">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="00">00</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="45">45</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {selectedDate && selectedTime && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-blue-900">Selected:</span>{' '}
                        <span className="text-gray-900">{format(selectedDate, 'PPP')} at {selectedTime}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <Label className="text-gray-900 font-semibold">Recurring Schedule *</Label>
                <div className="mt-3 space-y-4">
                  <div>
                    <Label htmlFor="recurring-frequency" className="text-sm text-gray-700 mb-2 block">Frequency</Label>
                    <Select value={recurringFrequency} onValueChange={(v: string) => setRecurringFrequency(v)}>
                      <SelectTrigger id="recurring-frequency" className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(recurringFrequency === 'weekly' || recurringFrequency === 'biweekly') && (
                    <div>
                      <Label className="text-sm text-gray-700 mb-2 block">Days of Week</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox
                              id={day}
                              checked={recurringDays.includes(day)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setRecurringDays([...recurringDays, day]);
                                } else {
                                  setRecurringDays(recurringDays.filter(d => d !== day));
                                }
                              }}
                            />
                            <Label htmlFor={day} className="text-sm cursor-pointer">
                              {day.slice(0, 3)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="recurring-time" className="text-sm font-medium text-gray-700 mb-2 block">
                      Select Time
                    </Label>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div className="flex items-center gap-2 flex-1">
                        <Select 
                          value={recurringTime ? recurringTime.split(':')[0] : ''} 
                          onValueChange={(hour) => {
                            const minutes = recurringTime ? recurringTime.split(':')[1] || '00' : '00';
                            setRecurringTime(`${hour.padStart(2, '0')}:${minutes}`);
                          }}
                        >
                          <SelectTrigger className="w-24 bg-white border-blue-300">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i.toString().padStart(2, '0');
                              const displayHour = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
                              return (
                                <SelectItem key={hour} value={hour}>
                                  {displayHour}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <span className="text-gray-500">:</span>
                        <Select 
                          value={recurringTime ? recurringTime.split(':')[1] || '00' : ''} 
                          onValueChange={(minute) => {
                            const hour = recurringTime ? recurringTime.split(':')[0] || '00' : '00';
                            setRecurringTime(`${hour}:${minute}`);
                          }}
                        >
                          <SelectTrigger className="w-24 bg-white border-blue-300">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="00">00</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="45">45</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {((recurringFrequency === 'weekly' || recurringFrequency === 'biweekly') && recurringDays.length > 0 && recurringTime) && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-blue-900">Schedule:</span>{' '}
                        <span className="text-gray-900">
                          {recurringFrequency === 'biweekly' ? 'Every other ' : 'Every '}
                          {recurringDays.join(', ')} at {recurringTime}
                        </span>
                      </p>
                    </div>
                  )}
                  {recurringFrequency === 'daily' && recurringTime && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-blue-900">Schedule:</span>{' '}
                        <span className="text-gray-900">Daily at {recurringTime}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <Label htmlFor="tags">Tags</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                Search for standardized tags from Wikidata to categorize your service want
              </p>
              <div className="mt-2">
                <WikidataAutocomplete
                  onSelect={(tag) => {
                    if (!tags.find(t => t.id === tag.id)) {
                      setTags([...tags, tag]);
                    }
                  }}
                  existingTags={tags}
                  placeholder="Search for tags (e.g., moving, gardening, tutoring)"
                />
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map(tag => (
                      <span 
                        key={tag.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-900 rounded-lg border border-blue-200"
                      >
                        <span className="text-xs text-blue-600 font-mono">{tag.id}</span>
                        #{tag.name}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {availableTags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Previously used tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.slice(0, 10).map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            if (!tags.find(t => t.id === tag.id)) {
                              setTags([...tags, tag]);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded border ${
                            tags.find(t => t.id === tag.id)
                              ? 'bg-blue-100 border-blue-300 text-blue-900'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button 
                type="button"
                variant="outline"
                onClick={() => onNavigate('dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Publishing...' : 'Publish Service Want'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
