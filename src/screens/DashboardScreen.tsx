interface DashboardScreenProps {
  onEditEvent?: (event: Event) => void;
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Event, Task } from '../types';
import { TaskItem } from '../components/TaskItem';

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onEditEvent }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks'>('calendar');
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
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
      // Fetch Events
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', user?.id)
        .order('date', { ascending: true });

      if (eventData) {
        const mappedEvents: Event[] = eventData.map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description,
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

      // Fetch Tasks
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (taskData) {
        setTasks(taskData.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          title: t.title,
          description: t.description,
          dueDate: t.due_date,
          isCompleted: t.is_completed,
          reminderTime: t.reminder_time,
          createdAt: t.created_at
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
          url: window.location.href
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
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

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

  const filteredEvents = events.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q);
  });

  return (
    <div className="pb-28 max-w-7xl mx-auto w-full min-h-screen bg-[#fafffe] shadow-sm relative">
      <div className="animate-gradient-bar h-[3px] w-full sticky top-0 z-50" />
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        className="hidden"
        accept="image/*"
      />

      {/* Glassmorphism Header */}
      <div className="sticky top-[3px] z-40 px-3 pt-3">
        <div
          className="rounded-2xl p-4 backdrop-blur-xl border border-white/40 shadow-lg mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(240,253,250,0.85) 0%, rgba(204,251,241,0.6) 50%, rgba(207,250,254,0.5) 100%)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-extrabold text-[#14312A] tracking-tight">Calendar</h1>
            <div className="size-10 rounded-full bg-white/60 flex items-center justify-center text-teal-700 shadow-sm">
              <span className="material-symbols-outlined">event_note</span>
            </div>
          </div>
          
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600/70 group-focus-within:text-teal-600 transition-colors">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-white/80 border border-white/50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400/50 text-sm font-semibold transition-all placeholder:text-teal-900/40 text-[#14312A] shadow-sm"
              placeholder="Search your events..."
              type="text"
            />
          </div>
        </div>
      </div>

      {/* Hosting / Created Events */}
      <section className="mt-4">
        <div className="px-5 mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#14312A]">Created by You <span className="text-teal-600/60 font-semibold text-sm ml-1">({filteredEvents.length})</span></h2>
        </div>

        {loading ? (
          <div className="px-5 flex items-center justify-center py-10">
            <div className="size-8 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="px-5 py-8 text-center bg-gradient-to-br from-teal-50 to-cyan-50 mx-4 rounded-3xl border border-teal-100/50">
            <span className="material-symbols-outlined text-4xl text-teal-300 mb-2">event_busy</span>
            <p className="text-sm font-semibold text-teal-800/60">
              {searchQuery ? 'No events found.' : "You haven't created any events yet."}
            </p>
          </div>
        ) : (
          <div className="flex overflow-x-auto hide-scrollbar gap-5 px-5 pb-4 snap-x snap-mandatory">
            {filteredEvents.map(event => (
              <div key={event.id} className="snap-center shrink-0 w-[85%] max-w-[320px] bg-white rounded-3xl p-4 shadow-lg shadow-teal-900/5 border border-teal-50 flex flex-col gap-4 transition-all hover:shadow-xl hover:-translate-y-1">
                <div
                  className="h-40 w-full rounded-2xl bg-cover bg-center relative overflow-hidden group"
                  style={{ backgroundImage: `url("${event.imageUrl}")` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14312A]/80 via-[#14312A]/10 to-transparent transition-opacity group-hover:opacity-90"></div>
                  <div className="absolute bottom-3 left-3 text-white">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/30 w-fit shadow-sm">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      <span>{event.date}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onUploadClick(event.id)}
                    className="absolute top-3 right-3 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full border border-white/30 transition-all shadow-sm opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                    title="Upload Photo to Gallery"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 px-1">
                  <h3 className="font-extrabold text-xl text-[#14312A] truncate">{event.title}</h3>
                  <div className="flex items-center gap-3 text-teal-700/70 text-xs font-semibold">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> {formatTime(event.time)}</span>
                    <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[16px]">location_on</span> {event.location}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-1">
                  <button onClick={() => onEditEvent && onEditEvent(event)} className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-teal-500/20 hover:shadow-lg hover:from-teal-400 hover:to-cyan-400 transition-all">Edit</button>
                  <button onClick={() => handleShare(event)} className="flex-1 bg-teal-50 text-teal-700 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-100 transition-all">Share</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* View Toggles & List */}
      <section className="mt-8 px-5">
        <div className="bg-teal-50/50 p-1.5 rounded-2xl flex border border-teal-100/50 mb-6 shadow-sm">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'calendar' ? 'bg-white text-teal-800 shadow-md shadow-teal-900/5' : 'text-teal-600/60 hover:text-teal-700'}`}
          >
            Events ({filteredEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'tasks' ? 'bg-white text-teal-800 shadow-md shadow-teal-900/5' : 'text-teal-600/60 hover:text-teal-700'}`}
          >
            Tasks ({tasks.length})
          </button>
        </div>

        <div className="flex flex-col gap-4 pb-20">
          {activeTab === 'calendar' ? (
            filteredEvents.length === 0 ? (
               <p className="text-center text-teal-600/60 py-10 font-semibold text-sm">No events in list view.</p>
            ) : (
              filteredEvents.map(event => (
                <div key={event.id} className="group relative bg-white rounded-3xl p-4 flex gap-4 shadow-soft border border-teal-50 hover:border-teal-200/50 hover:shadow-lg transition-all duration-300">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-gradient-to-b from-teal-400 to-cyan-400 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex-none w-16 flex flex-col items-center justify-center bg-gradient-to-br from-[#14312A] to-teal-900 text-white rounded-2xl py-3 h-fit shadow-md shadow-teal-900/20">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-200">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-2xl font-extrabold">{new Date(event.date).getDate()}</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
                    <h3 className="text-base font-extrabold text-[#14312A] leading-tight truncate">{event.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-teal-700/60">
                      <span className="flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100"><span className="material-symbols-outlined text-[14px]">schedule</span> {formatTime(event.time)}</span>
                      <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[14px]">location_on</span> {event.location}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                    <div className="size-12 rounded-full bg-cover bg-center border-2 border-white shadow-md ring-2 ring-teal-50" style={{ backgroundImage: `url("${event.imageUrl}")` }}></div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold uppercase tracking-wider">Hosting</span>
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="flex flex-col gap-3">
              {tasks.length === 0 && (
                <div className="py-10 text-center flex flex-col items-center gap-2">
                  <div className="size-16 rounded-full bg-teal-50 flex items-center justify-center text-teal-300 mb-2">
                    <span className="material-symbols-outlined text-3xl">task_alt</span>
                  </div>
                  <p className="text-teal-800 font-bold">You're all caught up!</p>
                  <p className="text-xs text-teal-600/60 font-medium">No pending tasks found.</p>
                </div>
              )}
              {tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={(updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardScreen;
