import React, { useState, useEffect } from 'react';

import { Event, Screen } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { deleteCalendarEvent } from '../lib/googleCalendar';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  initialSelectedDate?: string | null;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, initialSelectedDate }) => {
  const { user } = useAuth();
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);

  // Delete Modal State
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Calendar Logic
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Initialize with today's date formatted correctly
  const initDate = new Date();
  const initDateStr = `${initDate.getFullYear()}-${String(initDate.getMonth() + 1).padStart(2, '0')}-${String(initDate.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string | null>(initDateStr);

  // Sync with prop
  useEffect(() => {
    if (initialSelectedDate) {
      setSelectedDate(initialSelectedDate);
      const [y, m] = initialSelectedDate.split('-').map(Number);
      setCurrentMonth(new Date(y, m - 1, 1));
      fetchEvents();
    }
  }, [initialSelectedDate]);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter effect
  useEffect(() => {
    let filtered = allEvents;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = allEvents.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
      );
    }

    if (showAllFeatured) {
      setFeaturedEvents(filtered);
      setRecommendedEvents([]);
    } else {
      setFeaturedEvents(filtered.slice(0, 5));
      setRecommendedEvents(filtered.slice(5));
    }
  }, [allEvents, searchQuery, showAllFeatured]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const hasEventOnDate = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;

    return allEvents.some(e => e.date === dateStr);
  };

  const viewNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const viewPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };


  const fetchEvents = async () => {
    const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (data) {
      const mappedEvents: Event[] = data.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        location: e.location,
        imageUrl: e.image_url || 'https://picsum.photos/seed/event/800/600',
        category: e.category || 'General',
        distance: '2.5 mi',
        creatorId: e.creator_id // Need this to check ownership
      }));
      setAllEvents(mappedEvents);
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    setIsDeleting(true);

    try {
      // 1. Get the event details to check for Google Calendar ID
      const { data: eventData } = await supabase
        .from('events')
        .select('google_calendar_event_id')
        .eq('id', eventToDelete)
        .single();

      // 2. If it has a Google Calendar ID, delete it from Google first
      if (eventData?.google_calendar_event_id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const providerToken = session?.provider_token;
          if (providerToken) {
            await deleteCalendarEvent(eventData.google_calendar_event_id, providerToken);
          }
        } catch (googleError) {
          console.error("Failed to delete from Google Calendar", googleError);
        }
      }

      // 3. Delete from Supabase
      const { error } = await supabase.from('events').delete().eq('id', eventToDelete);

      if (error) throw error;

      // Success
      setAllEvents(prev => prev.filter(e => e.id !== eventToDelete));
      setEventToDelete(null);

    } catch (error: any) {
      alert('Failed to delete: ' + error.message);
    } finally {
      setIsDeleting(false);
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

  return (
    <div className="pb-24 relative max-w-7xl mx-auto w-full min-h-screen bg-white shadow-sm ring-1 ring-gray-100">
      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-black">Delete Event?</h3>
                <p className="text-sm text-gray-500 font-medium">This action cannot be undone.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button
                  onClick={() => setEventToDelete(null)}
                  disabled={isDeleting}
                  className="w-full py-3 rounded-xl font-bold text-black bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="w-full py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting && <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="text-lg font-bold text-black">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-2">
                <button onClick={viewPrevMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button onClick={viewNextMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
                <button onClick={() => setIsCalendarOpen(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-red-500">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-xs font-bold text-gray-400 py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 place-items-center shrink-0">
              {Array.from({ length: getDaysInMonth(currentMonth).firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="size-10"></div>
              ))}
              {Array.from({ length: getDaysInMonth(currentMonth).days }).map((_, i) => {
                const day = i + 1;
                // Fix timezone issue by using local construction
                const year = currentMonth.getFullYear();
                const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
                const dayStr = String(day).padStart(2, '0');
                const dateStr = `${year}-${month}-${dayStr}`;

                const isToday = day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
                const isSelected = selectedDate === dateStr;
                const hasEvent = hasEventOnDate(day);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`size-10 flex flex-col items-center justify-center rounded-full text-sm font-semibold relative transition-all 
                      ${isSelected
                        ? (hasEvent ? 'bg-red-600 text-white scale-110 shadow-lg z-10' : 'bg-black text-white scale-110 shadow-lg z-10')
                        : isToday
                          ? 'bg-gray-200 text-black'
                          : (hasEvent ? 'text-red-600 font-bold bg-red-50' : 'hover:bg-gray-50 text-text-main')
                      }
                    `}
                  >
                    <span>{day}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Date Events */}
            <div className="mt-6 pt-6 border-t border-gray-100 overflow-y-auto min-h-[100px]">
              <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
                {selectedDate ? new Date(selectedDate).toLocaleDateString('default', { month: 'long', day: 'numeric' }) : 'Select a date'}
              </h4>

              {selectedDate ? (
                (() => {
                  const dayEvents = allEvents.filter(e => e.date === selectedDate);

                  if (dayEvents.length === 0) {
                    return <p className="text-sm text-gray-400 text-center py-4">No events scheduled.</p>;
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      {dayEvents.map(event => (
                        <div key={event.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                          <div
                            className="size-10 rounded-lg bg-cover bg-center shrink-0"
                            style={{ backgroundImage: `url("${event.imageUrl}")` }}
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-bold text-black truncate">{event.title}</h5>
                            <p className="text-xs text-gray-500">{formatTime(event.time)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Tap a date to see events.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-white">
        <div className="flex items-center p-5 pb-2 justify-between">
          <div className="flex items-center gap-3.5 flex-1">
            <div className="relative">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-11 ring-2 ring-gray-100"
                style={{ backgroundImage: `url("${user?.avatar || 'https://ui-avatars.com/api/?name=User'}")` }}
              />
              <div className="absolute bottom-0 right-0 size-3.5 bg-green-500 border-[2.5px] border-white rounded-full"></div>
            </div>
            <div>
              <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">Welcome back</p>
              <h2 className="text-text-main text-xl font-extrabold leading-tight">{user?.name}</h2>
            </div>
          </div>
          <button className="relative flex items-center justify-center rounded-full size-11 bg-surface border border-border-light text-text-main hover:bg-gray-100 transition-all hover:scale-105 active:scale-95">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            <span className="absolute top-2.5 right-3 size-2 bg-accent rounded-full border border-white"></span>
          </button>
        </div>

        <div className="px-5 pb-4 mt-2">
          {/* Improved Search Bar Layout */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-black transition-colors">
                <span className="material-symbols-outlined">search</span>
              </span>
              <input
                className="w-full h-12 pl-12 pr-4 bg-surface border border-border-light rounded-2xl outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 text-text-main placeholder-text-muted transition-all shadow-sm font-medium"
                placeholder="Search events..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="size-12 shrink-0 flex items-center justify-center rounded-2xl bg-surface border border-border-light hover:bg-gray-100 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[24px] text-text-main">tune</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Events */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="text-xl font-bold text-text-main">Featured Events</h2>
          <button
            onClick={() => setShowAllFeatured(!showAllFeatured)}
            className="text-sm font-bold text-secondary hover:text-secondary/80 transition-colors flex items-center gap-0.5"
          >
            {showAllFeatured ? 'Show Less' : 'See All'} <span className="material-symbols-outlined text-[16px]">{showAllFeatured ? 'expand_less' : 'chevron_right'}</span>
          </button>
        </div>

        {featuredEvents.length === 0 ? (
          <div className="px-5 text-gray-400 text-sm">No events found.</div>
        ) : (
          <div className={`px-5 ${showAllFeatured ? 'grid grid-cols-1 gap-5' : 'flex overflow-x-auto hide-scrollbar gap-5 pb-4 snap-x snap-mandatory'}`}>
            {featuredEvents.map((event) => (
              <div key={event.id} className={`snap-center shrink-0 ${showAllFeatured ? 'w-full' : 'w-[88%] max-w-[340px]'} relative rounded-3xl overflow-hidden aspect-[16/10] group cursor-pointer shadow-lg shadow-black/10 hover:shadow-xl transition-shadow`}>
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url("${event.imageUrl}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Delete Button for Owner */}
                {/* @ts-ignore */}
                {user?.id === event.creatorId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEventToDelete(event.id); }}
                    className="absolute top-4 left-4 bg-red-500/90 hover:bg-red-600 backdrop-blur-sm text-white size-8 flex items-center justify-center rounded-lg shadow-sm transition-colors z-20"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}

                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/20 text-white size-8 flex items-center justify-center rounded-full">
                  <span className="material-symbols-outlined text-[18px]">favorite</span>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-5 flex flex-col gap-1.5">
                  <h3 className="text-white text-2xl font-bold leading-tight">{event.title}</h3>
                  <div className="flex items-center gap-4 text-white/90 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      <span>{event.date} • {formatTime(event.time)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span className="truncate max-w-[120px]">{event.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      {!showAllFeatured && (
        <section className="px-5 mt-8">
          <h3 className="text-text-main text-lg font-bold mb-5">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-4">
            <button onClick={() => setIsCalendarOpen(true)} className="flex flex-col items-center gap-2.5 group">
              <div className="size-16 rounded-2xl bg-white text-blue-600 border border-border-light flex items-center justify-center shadow-sm group-hover:bg-blue-50 transition-colors">
                <span className="material-symbols-outlined text-[28px]">calendar_month</span>
              </div>
              <span className="text-xs font-medium text-text-muted group-hover:text-blue-600 transition-colors">Calendar</span>
            </button>
            <button className="flex flex-col items-center gap-2.5 group">
              <div className="size-16 rounded-2xl bg-white text-orange-500 border border-border-light flex items-center justify-center shadow-sm group-hover:bg-orange-50 transition-colors">
                <span className="material-symbols-outlined text-[28px]">confirmation_number</span>
              </div>
              <span className="text-xs font-medium text-text-muted group-hover:text-orange-500 transition-colors">Tickets</span>
            </button>
            <button className="flex flex-col items-center gap-2.5 group">
              <div className="size-16 rounded-2xl bg-white text-purple-600 border border-border-light flex items-center justify-center shadow-sm group-hover:bg-purple-50 transition-colors">
                <span className="material-symbols-outlined text-[28px]">groups</span>
              </div>
              <span className="text-xs font-medium text-text-muted group-hover:text-purple-600 transition-colors">Invites</span>
            </button>
          </div>
        </section>
      )}

      {/* Recommended */}
      {!showAllFeatured && recommendedEvents.length > 0 && (
        <section className="px-5 mt-8">
          <h3 className="text-lg font-bold text-text-main mb-5">Recommended For You</h3>
          <div className="flex flex-col gap-4">
            {recommendedEvents.map((event) => (
              <div key={event.id} className="bg-white p-3 rounded-2xl flex gap-4 shadow-soft border border-border-light hover:border-black/10 transition-colors cursor-pointer group">
                <div
                  className="w-24 aspect-square rounded-xl bg-cover bg-center shrink-0 relative overflow-hidden"
                  style={{ backgroundImage: `url("${event.imageUrl}")` }}
                />
                <div className="flex flex-col justify-between py-1 flex-1">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${event.category === 'Wellness' ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-purple-700 bg-purple-50 border border-purple-100'
                        }`}>
                        {event.category}
                      </span>
                      <span className="text-[11px] font-medium text-text-muted flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">near_me</span>
                        {event.distance}
                      </span>

                      {/* Delete Button for Recommended (Owner) */}
                      {/* @ts-ignore */}
                      {user?.id === event.creatorId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEventToDelete(event.id); }}
                          className="ml-auto text-red-500 hover:text-red-700 p-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                    <h4 className="text-text-main font-bold text-[15px] leading-snug line-clamp-2">{event.title}</h4>
                    <p className="text-text-muted text-xs font-medium mt-1">{event.date} • {formatTime(event.time)}</p>
                  </div>
                  {event.attendeesCount && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex -space-x-2 overflow-hidden">
                        {event.attendeesAvatars?.map((av, i) => (
                          <img key={i} src={av} className="inline-block size-5 rounded-full ring-2 ring-white object-cover" alt="User" />
                        ))}
                      </div>
                      <span className="text-[10px] text-text-muted font-semibold">+{event.attendeesCount} going</span>
                    </div>
                  )}
                  {event.id === 'r2' && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-text-main font-semibold flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100">
                        <span className="material-symbols-outlined text-[12px] text-amber-500 fill-amber-500">star</span>
                        4.9
                      </span>
                      <span className="text-[10px] text-text-muted">(120 reviews)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomeScreen;
