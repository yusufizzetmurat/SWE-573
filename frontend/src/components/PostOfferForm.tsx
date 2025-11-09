import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
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

interface PostOfferFormProps {
  onNavigate: (page: string, data?: any) => void;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
  serviceData?: any; // Pre-filled service data for reposting
}

export function PostOfferForm({ onNavigate, userBalance = 1, unreadNotifications = 2, onLogout, serviceData }: PostOfferFormProps) {
  const { showToast } = useToast();
  const [scheduleType, setScheduleType] = useState<'one-time' | 'recurrent'>('recurrent');
  const [tags, setTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'biweekly'>('weekly');
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringTime, setRecurringTime] = useState<string>('');
  const [oneTimeHour, setOneTimeHour] = useState('');
  const [oneTimeMinute, setOneTimeMinute] = useState('00');
  const [oneTimePeriod, setOneTimePeriod] = useState<'AM' | 'PM'>('AM');
  const [recurringHour, setRecurringHour] = useState('');
  const [recurringMinute, setRecurringMinute] = useState('00');
  const [recurringPeriod, setRecurringPeriod] = useState<'AM' | 'PM'>('AM');
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

  const parseTimeValue = (value: string) => {
    if (!value) {
      return { hour: '', minute: '00', period: 'AM' as const };
    }
    const [rawHour, rawMinute = '00'] = value.split(':');
    let hourNum = parseInt(rawHour, 10);
    if (Number.isNaN(hourNum)) {
      return { hour: '', minute: '00', period: 'AM' as const };
    }
    let period: 'AM' | 'PM' = 'AM';
    if (hourNum === 0) {
      hourNum = 12;
    } else if (hourNum === 12) {
      period = 'PM';
    } else if (hourNum > 12) {
      hourNum -= 12;
      period = 'PM';
    }
    return {
      hour: hourNum.toString(),
      minute: rawMinute.padStart(2, '0'),
      period,
    };
  };

  const to24HourString = (hour12: string, minute: string, period: 'AM' | 'PM') => {
    if (!hour12) return '';
    let hourNum = parseInt(hour12, 10);
    if (Number.isNaN(hourNum)) return '';
    if (period === 'PM' && hourNum !== 12) {
      hourNum += 12;
    }
    if (period === 'AM' && hourNum === 12) {
      hourNum = 0;
    }
    return `${hourNum.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
  };

  const formatDisplayTime = (timeValue: string) => {
    const { hour, minute, period } = parseTimeValue(timeValue);
    if (!hour) return '';
    return `${hour}:${minute} ${period}`;
  };

  const updateOneTimeTime = (hour: string, minute: string, period: 'AM' | 'PM') => {
    setOneTimeHour(hour);
    setOneTimeMinute(minute);
    setOneTimePeriod(period);
    if (hour) {
      setSelectedTime(to24HourString(hour, minute, period));
    } else {
      setSelectedTime('');
    }
  };

  const updateRecurringScheduleTime = (hour: string, minute: string, period: 'AM' | 'PM') => {
    setRecurringHour(hour);
    setRecurringMinute(minute);
    setRecurringPeriod(period);
    if (hour) {
      setRecurringTime(to24HourString(hour, minute, period));
    } else {
      setRecurringTime('');
    }
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

  useEffect(() => {
    const { hour, minute, period } = parseTimeValue(selectedTime);
    setOneTimeHour(hour);
    setOneTimeMinute(minute);
    setOneTimePeriod(period);
  }, [selectedTime]);

  useEffect(() => {
    const { hour, minute, period } = parseTimeValue(recurringTime);
    setRecurringHour(hour);
    setRecurringMinute(minute);
    setRecurringPeriod(period);
  }, [recurringTime]);

  const addTag = async () => {
    if (newTag.trim()) {
      const tagName = newTag.trim();
      const tagNameLower = tagName.toLowerCase();
      
      // Try to find existing tag
      const existingTag = availableTags.find(t => 
        t.name.toLowerCase() === tagNameLower || 
        t.id.toLowerCase() === tagNameLower
      );
      
      if (existingTag) {
        if (!tags.find(t => t.id === existingTag.id)) {
          setTags([...tags, existingTag]);
          setNewTag('');
        } else {
          showToast('Tag already added', 'warning');
        }
      } else {
        // Create new tag
        try {
          const newTagObj = await tagAPI.create(tagName);
          setTags([...tags, newTagObj]);
          setAvailableTags([...availableTags, newTagObj]);
          setNewTag('');
          showToast(`Tag "${tagName}" created`, 'success');
        } catch (error: unknown) {
          console.error('Failed to create tag:', error);
          // If creation fails, still add it as a temporary tag (backend will create it)
          const tempTag: Tag = { id: tagNameLower, name: tagName };
          setTags([...tags, tempTag]);
          setNewTag('');
          showToast(`Tag "${tagName}" will be created when you submit`, 'info');
        }
      }
    }
  };

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
        const displayTime = formatDisplayTime(selectedTime);
        scheduleDetails = `${formattedDate} at ${displayTime || selectedTime}`;
      } else if (scheduleType === 'one-time' && (!selectedDate || !selectedTime)) {
        showToast('Please select both date and time for one-time events', 'warning');
        setIsSubmitting(false);
        return;
      } else if (scheduleType === 'recurrent') {
        if ((recurringFrequency === 'weekly' || recurringFrequency === 'biweekly') && recurringDays.length > 0 && recurringTime) {
          const prefix = recurringFrequency === 'biweekly' ? 'Every other' : 'Every';
          const displayTime = formatDisplayTime(recurringTime);
          scheduleDetails = `${prefix} ${recurringDays.join(', ')} at ${displayTime || recurringTime}`;
        } else if (recurringFrequency === 'daily' && recurringTime) {
          const displayTime = formatDisplayTime(recurringTime);
          scheduleDetails = `Daily at ${displayTime || recurringTime}`;
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
        // Check if tag has a UUID format (existing tag) or is a temporary tag (new)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tag.id);
        if (isUUID) {
          existingTagIds.push(tag.id);
        } else {
          newTagNames.push(tag.name);
        }
      });
      
      await serviceAPI.create({
        title: formData.title,
        description: formData.description,
        type: 'Offer',
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
      });

      showToast('Service offer published successfully!', 'success');
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
            <h1 className="text-gray-900 mb-2">Post a New Offer</h1>
            <p className="text-gray-600">
              Share your skills and knowledge with the community
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Offer Title */}
            <div>
              <Label htmlFor="title">Offer Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Manti Cooking Lesson"
                className="mt-2"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Keep it clear and descriptive
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what you're offering, what participants will learn or experience, and any requirements..."
                className="mt-2 min-h-[180px]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Include details about what you'll provide and what participants should bring
              </p>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="duration">Duration (in Hours) *</Label>
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
                <Label htmlFor="participants">Maximum Participants *</Label>
                <Input
                  id="participants"
                  type="number"
                  min="1"
                  max="20"
                  placeholder="e.g., 4"
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
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></span>
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
              <Label htmlFor="schedule-type">Schedule Type *</Label>
              <RadioGroup 
                value={scheduleType} 
                onValueChange={(value) => setScheduleType(value as 'one-time' | 'recurrent')}
                className="mt-2"
                id="schedule-type"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one-time" id="one-time" />
                  <Label htmlFor="one-time" className="cursor-pointer">
                    One-time Event
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurrent" id="recurrent" />
                  <Label htmlFor="recurrent" className="cursor-pointer">
                    Recurrent Event
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Schedule Details */}
            {scheduleType === 'one-time' ? (
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                <Label className="text-gray-900 font-semibold">Event Date & Time *</Label>
                <div className="mt-3 space-y-3">
                  {/* Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white hover:bg-amber-50 border-amber-300 hover:border-amber-400 transition-all duration-200"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-amber-600" />
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
                      <Clock className="h-4 w-4 text-amber-600" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={oneTimeHour}
                          onValueChange={(hour) => updateOneTimeTime(hour, oneTimeMinute, oneTimePeriod)}
                        >
                          <SelectTrigger className="w-20 bg-white border-amber-300">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="w-24 max-h-52 overflow-y-auto rounded-lg border border-amber-200 bg-white shadow-lg"
                          >
                            {Array.from({ length: 12 }, (_, i) => {
                              const hour = (i + 1).toString();
                              return (
                                <SelectItem
                                  key={hour}
                                  value={hour}
                                  className="justify-center text-sm font-medium"
                                >
                                  {hour}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <span className="text-gray-500">:</span>
                        <Select
                          value={oneTimeMinute}
                          onValueChange={(minute) => updateOneTimeTime(oneTimeHour, minute, oneTimePeriod)}
                        >
                          <SelectTrigger className="w-20 bg-white border-amber-300">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="w-24 rounded-lg border border-amber-200 bg-white shadow-lg"
                          >
                            <SelectItem value="00" className="justify-center text-sm font-medium">
                              00
                            </SelectItem>
                            <SelectItem value="15" className="justify-center text-sm font-medium">
                              15
                            </SelectItem>
                            <SelectItem value="30" className="justify-center text-sm font-medium">
                              30
                            </SelectItem>
                            <SelectItem value="45" className="justify-center text-sm font-medium">
                              45
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={oneTimePeriod}
                          onValueChange={(period) => updateOneTimeTime(oneTimeHour, oneTimeMinute, period as 'AM' | 'PM')}
                        >
                          <SelectTrigger className="w-20 bg-white border-amber-300">
                            <SelectValue placeholder="AM" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="w-20 rounded-lg border border-amber-200 bg-white shadow-lg"
                          >
                            <SelectItem value="AM" className="justify-center text-sm font-medium">
                              AM
                            </SelectItem>
                            <SelectItem value="PM" className="justify-center text-sm font-medium">
                              PM
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {selectedDate && selectedTime && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-amber-900">Selected:</span>{' '}
                        <span className="text-gray-900">{format(selectedDate, 'PPP')} at {formatDisplayTime(selectedTime)}</span>
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
                      <Clock className="h-4 w-4 text-amber-600" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={recurringHour}
                          onValueChange={(hour) => updateRecurringScheduleTime(hour, recurringMinute, recurringPeriod)}
                        >
                          <SelectTrigger className="w-20 bg-white border-amber-300">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="w-24 max-h-52 overflow-y-auto rounded-lg border border-amber-200 bg-white shadow-lg"
                          >
                            {Array.from({ length: 12 }, (_, i) => {
                              const hour = (i + 1).toString();
                              return (
                                <SelectItem
                                  key={hour}
                                  value={hour}
                                  className="justify-center text-sm font-medium"
                                >
                                  {hour}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <span className="text-gray-500">:</span>
                        <Select
                          value={recurringMinute}
                          onValueChange={(minute) => updateRecurringScheduleTime(recurringHour, minute, recurringPeriod)}
                        >
                          <SelectTrigger className="w-20 bg-white border-amber-300">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="w-24 rounded-lg border border-amber-200 bg-white shadow-lg"
                          >
                            <SelectItem value="00" className="justify-center text-sm font-medium">
                              00
                            </SelectItem>
                            <SelectItem value="15" className="justify-center text-sm font-medium">
                              15
                            </SelectItem>
                            <SelectItem value="30" className="justify-center text-sm font-medium">
                              30
                            </SelectItem>
                            <SelectItem value="45" className="justify-center text-sm font-medium">
                              45
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={recurringPeriod}
                          onValueChange={(period) => updateRecurringScheduleTime(recurringHour, recurringMinute, period as 'AM' | 'PM')}
                        >
                          <SelectTrigger className="w-20 bg-white border-amber-300">
                            <SelectValue placeholder="AM" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="w-20 rounded-lg border border-amber-200 bg-white shadow-lg"
                          >
                            <SelectItem value="AM" className="justify-center text-sm font-medium">
                              AM
                            </SelectItem>
                            <SelectItem value="PM" className="justify-center text-sm font-medium">
                              PM
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {((recurringFrequency === 'weekly' || recurringFrequency === 'biweekly') && recurringDays.length > 0 && recurringTime) && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-amber-900">Schedule:</span>{' '}
                        <span className="text-gray-900">
                          {recurringFrequency === 'biweekly' ? 'Every other ' : 'Every '}
                          {recurringDays.join(', ')} at {recurringTime}
                        </span>
                      </p>
                    </div>
                  )}
                  {recurringFrequency === 'daily' && recurringTime && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-amber-900">Schedule:</span>{' '}
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
              <div className="mt-2">
                <div className="flex gap-2 mb-3">
                  <Input
                    id="tags"
                    placeholder="Type a tag (e.g., cooking, education)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    list="available-tags-list"
                  />
                  <datalist id="available-tags-list">
                    {availableTags.map(tag => (
                      <option key={tag.id} value={tag.name} />
                    ))}
                  </datalist>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={addTag}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span 
                        key={tag.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-900 rounded-lg border border-amber-200"
                      >
                        #{tag.name}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-amber-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {availableTags.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Available tags:</p>
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
                              ? 'bg-amber-100 border-amber-300 text-amber-900'
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
                {isSubmitting ? 'Publishing...' : 'Publish Offer'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
