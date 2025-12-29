interface DashboardScreenProps {
  onEditEvent?: (event: Event) => void;
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Event } from '../types';

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onEditEvent }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'hosting' | 'past'>('upcoming');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForEventId, setUploadingForEventId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserEvents();
    }
  }, [user]);

  const fetchUserEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', user?.id)
        .order('date', { ascending: true });

      if (error) throw error;

      if (data) {
        const mappedEvents: Event[] = data.map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description, // Added description for editing
          date: e.date,
          time: e.time,
          location: e.location,
          imageUrl: e.image_url || 'https://picsum.photos/seed/event/800/600',
          category: e.category || 'General',
          distance: '0 mi',
          creatorId: e.creator_id
        }));
        setEvents(mappedEvents);
      }
    } catch (error) {
      console.error('Error fetching user events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (event: Event) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: `Join me at ${event.title} !`,
          url: window.location.href // Ideally deep link
        });
      } else {
        await navigator.clipboard.writeText(`Join me at ${event.title}: ${window.location.href} `);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const onUploadClick = (eventId: string) => {
    setUploadingForEventId(eventId);
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !uploadingForEventId) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `gallery/${uploadingForEventId}/${Math.random()}.${fileExt}`;

    try {
      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      // 2. Insert into event_photos table
      const { error: dbError } = await supabase
        .from('event_photos')
        .insert({
          event_id: uploadingForEventId,
          user_id: user?.id,
          photo_url: publicUrl
        });

      if (dbError) throw dbError;

      alert('Photo uploaded to gallery successfully!');

    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploadingForEventId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const m = minutes || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  // Filter Logic
  const filteredEvents = events.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q);
  });

  return (
    <div className="pb-28 max-w-7xl mx-auto w-full min-h-screen bg-white shadow-sm ring-1 ring-gray-100">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        className="hidden"
        accept="image/*"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-border-light space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full bg-surface border border-border-light shadow-sm bg-cover bg-center"
              style={{ backgroundImage: `url("${user?.avatar || 'https://ui-avatars.com/api/?name=' + user?.name}")` }}
            />
            <div>
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wide">Dashboard</p>
              <h1 className="text-xl font-bold leading-tight text-black">My Events</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-full hover:bg-surface relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-black transition-colors">
            <span className="material-symbols-outlined">search</span>
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-surface border border-border-light rounded-xl outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 text-sm font-medium transition-all"
            placeholder="Search your events..."
            type="text"
          />
        </div>
      </header>

      {/* Hosting / Created Events */}
      <section className="mt-6">
        <div className="px-5 mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Created by You <span className="text-text-muted font-medium text-lg ml-1">({filteredEvents.length})</span></h2>
        </div>

        {loading ? (
          <div className="px-5 text-sm text-gray-400">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="px-5 text-sm text-gray-400">
            {searchQuery ? 'No events found.' : "You haven't created any events yet."}
          </div>
        ) : (
          <div className="flex overflow-x-auto no-scrollbar gap-4 px-5 pb-2">
            {filteredEvents.map(event => (
              <div key={event.id} className="flex-none w-80 bg-white rounded-3xl p-4 shadow-soft border border-border-light flex flex-col gap-4">
                <div
                  className="h-36 w-full rounded-2xl bg-cover bg-center relative overflow-hidden"
                  style={{ backgroundImage: `url("${event.imageUrl}")` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 text-white">
                    <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 w-fit">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      <span>{event.date}</span>
                    </div>
                  </div>

                  {/* Upload Button Overlay */}
                  <button
                    onClick={() => onUploadClick(event.id)}
                    className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white p-2 rounded-full transition-all"
                    title="Upload Photo to Gallery"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-lg text-black truncate">{event.title}</h3>
                  <div className="flex items-center gap-2 text-text-muted text-sm font-medium">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">schedule</span> {formatTime(event.time)}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[18px]">location_on</span> {event.location}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-1">
                  <button onClick={() => onEditEvent && onEditEvent(event)} className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all">Edit</button>
                  <button onClick={() => handleShare(event)} className="flex-1 bg-surface text-black border border-border-light py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all">Share</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tabs */}
      <section className="mt-8">
        <div className="sticky top-[73px] z-20 bg-white pt-2 pb-4 border-b border-transparent">
          <div className="mx-5 bg-surface p-1.5 rounded-2xl flex border border-border-light">
            {['upcoming', 'hosting', 'past'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-text-muted hover:text-black'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* List - Using same events list for now as a "Feed" */}
        <div className="px-5 flex flex-col gap-6 mt-4">
          <div className="flex items-center gap-4">
            {/* Dynamic Header based on logic, keeping simple for now */}
            <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Your Timeline</p>
            <div className="h-[1px] flex-1 bg-border-light"></div>
          </div>

          {filteredEvents.map(event => (
            <div key={event.id} className="group relative bg-white rounded-3xl p-5 flex gap-5 shadow-sharp border border-border-light hover:border-black/20 active:scale-[0.99] transition-all">
              <div className="flex-none w-16 flex flex-col items-center justify-center bg-black text-white rounded-2xl py-3 h-fit shadow-md shadow-black/20">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                <span className="text-2xl font-bold">{new Date(event.date).getDate()}</span>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-1.5">
                <h3 className="text-lg font-bold text-black leading-tight">{event.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-text-muted">
                  <span className="flex items-center gap-1 bg-surface px-2 py-0.5 rounded-md border border-border-light"><span className="material-symbols-outlined text-[16px]">schedule</span> {formatTime(event.time)}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {event.location}</span>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between gap-2">
                <div className="h-14 w-14 rounded-full bg-cover bg-center border-2 border-surface-dark shadow-sm" style={{ backgroundImage: `url("${event.imageUrl}")` }}></div>
                <span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold uppercase tracking-wide">Hosting</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardScreen;
