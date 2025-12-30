import React, { useState, useEffect } from 'react';

import { Event, Screen, Task } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { deleteCalendarEvent } from '../lib/googleCalendar';
import { deleteGoogleTask, listGoogleTasks } from '../lib/googleTasks';
import { ReminderButton } from '../components/ReminderButton';
import { TaskItem } from '../components/TaskItem';
import { NotificationCenter } from '../components/NotificationCenter';

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

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [upcomingToday, setUpcomingToday] = useState<Event[]>([]);

  // Delete Modal State
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
    if (user) {
      fetchEvents();
      fetchTasks();
    }
  }, [user, initialSelectedDate]); // Initial fetch

  // Realtime Subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_completed', false)
        .order('due_date', { ascending: true }); // Show soonest first

      if (data) {
        setTasks(data.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          title: t.title,
          description: t.description,
          dueDate: t.due_date,
          isCompleted: t.is_completed,
          createdAt: t.created_at
        })));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleTaskUpdate = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

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
        creatorId: e.creator_id, // Need this to check ownership
        googleCalendarEventId: e.google_calendar_event_id
      }));
      setAllEvents(mappedEvents);

      // Filter for "Today" (Simple string match for now, ideal matches date object)
      const todayStr = new Date().toISOString().split('T')[0];
      setUpcomingToday(mappedEvents.filter(e => e.date === todayStr));
    }

    // Sync Google Tasks Status
    syncGoogleTasks();
  };

  const syncGoogleTasks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;
      if (!providerToken) return;

      const googleTasks = await listGoogleTasks(providerToken);

      // Find tasks in Supabase that are NOT completed, but ARE completed in Google
      // This is a simple one-way sync from Google -> App on load
      const { data: localTasks } = await supabase.from('tasks').select('*').eq('is_completed', false);

      if (localTasks && googleTasks.length > 0) {
        for (const localTask of localTasks) {
          if (localTask.google_task_id) {
            const googleTask = googleTasks.find((gt: any) => gt.id === localTask.google_task_id);
            // 'status' can be 'needsAction' or 'completed'
            if (googleTask && googleTask.status === 'completed') {
              console.log('Syncing completed task:', localTask.title);
              await supabase.from('tasks').update({ is_completed: true }).eq('id', localTask.id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Task Sync Error', err);
    }
  };

  const hasEventOnDate = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;

    const hasEvent = allEvents.some(e => e.date === dateStr);
    const hasTask = tasks.some(t => {
      if (!t.dueDate) return false;
      return t.dueDate.startsWith(dateStr);
    });

    return { hasEvent, hasTask };
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

  const confirmTaskDelete = async (taskId: string) => {
    if (!taskId) return;
    if (!window.confirm("Delete this task?")) return; // Simple confirm for now

    try {
      const { data: taskData } = await supabase.from('tasks').select('google_task_id, google_calendar_event_id').eq('id', taskId).single();

      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;

      if (providerToken) {
        // 1. Delete from Google Tasks
        if (taskData?.google_task_id) {
          try {
            await deleteGoogleTask(taskData.google_task_id, providerToken);
          } catch (err) {
            console.error("Failed to delete from Google Tasks", err);
          }
        }

        // 2. Delete from Google Calendar (if exists)
        if (taskData?.google_calendar_event_id) {
          try {
            await deleteCalendarEvent(taskData.google_calendar_event_id, providerToken);
          } catch (err) {
            console.error("Failed to delete from Google Calendar", err);
          }
        }
      }

      // 2. Delete from Supabase
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;

      // Optimistic Update: Remove from UI immediately
      setTasks(prev => prev.filter(t => t.id !== taskId));
      // Remove from googleTasks synced list if we want, but local state is main priority

    } catch (error: any) {
      alert("Failed to delete task: " + error.message);
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
                const { hasEvent, hasTask } = hasEventOnDate(day);
                const hasActivity = hasEvent || hasTask;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`size-10 flex flex-col items-center justify-center rounded-full text-sm font-semibold relative transition-all 
                      ${isSelected
                        ? 'bg-black text-white scale-110 shadow-lg z-10'
                        : isToday
                          ? 'bg-gray-200 text-black'
                          : (hasActivity ? 'bg-gray-50 text-black font-bold' : 'hover:bg-gray-50 text-text-main')
                      }
                    `}
                  >
                    <span>{day}</span>
                    <div className="flex gap-0.5 absolute bottom-1.5">
                      {hasEvent && <div className="size-1 bg-red-500 rounded-full"></div>}
                      {hasTask && <div className="size-1 bg-green-500 rounded-full"></div>}
                    </div>
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
                  const dayTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(selectedDate));

                  if (dayEvents.length === 0 && dayTasks.length === 0) {
                    return <p className="text-sm text-gray-400 text-center py-4">No events or tasks scheduled.</p>;
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      {/* Events */}
                      {dayEvents.map(event => (
                        <div key={event.id} className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-xl shadow-sm">
                          <div
                            className="size-10 rounded-lg bg-cover bg-center shrink-0"
                            style={{ backgroundImage: `url("${event.imageUrl}")` }}
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-bold text-black truncate">{event.title}</h5>
                            <p className="text-xs text-red-500 font-medium">{formatTime(event.time)} • Event</p>
                          </div>
                        </div>
                      ))}

                      {/* Tasks */}
                      {dayTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group/task">
                          <div className={`size-3 rounded-full border-[3px] ${task.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'}`} />
                          <div className="flex-1 min-w-0">
                            <h5 className={`text-sm font-bold truncate ${task.isCompleted ? 'text-gray-400 line-through' : 'text-black'}`}>{task.title}</h5>
                            <p className="text-xs text-green-600 font-medium">Task</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); confirmTaskDelete(task.id); }}
                            className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors shrink-0"
                            title="Delete Task"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Tap a date to see agenda.</p>
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
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative flex items-center justify-center rounded-full size-11 border border-border-light text-text-main transition-all hover:scale-105 active:scale-95 ${showNotifications ? 'bg-black text-white' : 'bg-surface hover:bg-gray-100'}`}
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-2.5 right-3 size-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
          </div>
        </div>
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

      {/* Upcoming Today (New Section) */}
      {
        !showAllFeatured && upcomingToday.length > 0 && (
          <section className="px-5 mt-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Happening Today</h3>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {upcomingToday.map(event => (
                <div key={event.id} className="min-w-[260px] p-4 rounded-3xl bg-black text-white flex gap-4 items-center shadow-lg shadow-black/20">
                  <div
                    className="size-14 rounded-2xl bg-cover bg-center shrink-0 border border-white/20"
                    style={{ backgroundImage: `url("${event.imageUrl}")` }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg truncate leading-tight">{event.title}</h4>
                    <p className="text-gray-400 text-xs mt-1 font-medium">{formatTime(event.time)} • {event.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      }

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
              <div key={event.id} className={`snap-center shrink-0 ${showAllFeatured ? 'w-full' : 'w-[88%] max-w-[340px]'} relative aspect-[16/10] group cursor-pointer shadow-lg shadow-black/10 hover:shadow-xl transition-shadow`}>
                {/* Content Wrapper (Clipped) */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden transform-gpu">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url("${event.imageUrl}")` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

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

                {/* Overlays (Unclipped) */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                  {/* Delete Button for Owner */}
                  {/* @ts-ignore */}
                  {user?.id === event.creatorId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEventToDelete(event.id); }}
                      className="absolute top-4 left-4 bg-red-500/90 hover:bg-red-600 backdrop-blur-sm text-white size-8 flex items-center justify-center rounded-lg shadow-sm transition-colors pointer-events-auto"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}

                  <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
                    <ReminderButton eventId={event.id} googleEventId={event.googleCalendarEventId} />
                    <div className="bg-black/40 backdrop-blur-md border border-white/20 text-white size-8 flex items-center justify-center rounded-full">
                      <span className="material-symbols-outlined text-[18px]">favorite</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      {
        !showAllFeatured && (
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
        )
      }

      {/* Recommended */}
      {
        !showAllFeatured && recommendedEvents.length > 0 && (
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

                        {/* Actions: delete + reminder */}
                        <div className="ml-auto flex items-center gap-1">
                          <ReminderButton eventId={event.id} googleEventId={event.googleCalendarEventId} className="scale-90" />

                          {/* @ts-ignore */}
                          {user?.id === event.creatorId && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEventToDelete(event.id); }}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
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
        )
      }

      {/* Tasks Section */}
      {
        !showAllFeatured && (
          <section className="px-5 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-main">Tasks & Agenda</h3>
              <button className="text-sm font-bold text-secondary">View All</button>
            </div>

            <div className="flex flex-col gap-3">
              {tasks.length === 0 ? (
                <p className="text-gray-400 text-sm">No tasks pending. Great job!</p>
              ) : (
                tasks.slice(0, 3).map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onUpdate={handleTaskUpdate}
                    onDelete={confirmTaskDelete}
                  />
                ))
              )}
            </div>
          </section>
        )
      }
    </div >
  );
};

export default HomeScreen;
