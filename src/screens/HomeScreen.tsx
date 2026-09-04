import React, { useState, useEffect, useMemo, useRef } from 'react';

import { Event, Screen, Task } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { deleteCalendarEvent, listCalendarEvents } from '../lib/googleCalendar';
import { deleteGoogleTask, listGoogleTasks, updateGoogleTask } from '../lib/googleTasks';
import { ReminderButton } from '../components/ReminderButton';
import { TaskItem } from '../components/TaskItem';
import { NotificationCenter } from '../components/NotificationCenter';
import { TicketsListModal } from './TicketsListModal';

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
  const [showTicketsModal, setShowTicketsModal] = useState(false);

  // Calendar Logic
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Initialize with today's date formatted correctly
  const initDate = new Date();
  const initDateStr = `${initDate.getFullYear()}-${String(initDate.getMonth() + 1).padStart(2, '0')}-${String(initDate.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string | null>(initDateStr);

  // NEW: Hero carousel state
  const [heroIndex, setHeroIndex] = useState(0);
  const dateScrollerRef = useRef<HTMLDivElement>(null);

  // NEW: Date scroller dates (14 days centered around today)
  const dateScrollerDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = -3; i < 11; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  // NEW: Stats computed
  const stats = useMemo(() => {
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      eventsThisWeek: allEvents.filter(e => {
        const ed = new Date(e.date);
        return ed >= new Date(todayStr) && ed <= weekFromNow;
      }).length,
      pendingTasks: tasks.filter(t => !t.isCompleted).length,
      completedTasks: tasks.filter(t => t.isCompleted).length,
      totalTasks: tasks.length,
    };
  }, [allEvents, tasks]);

  // NEW: Hero carousel auto-advance
  useEffect(() => {
    if (upcomingToday.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % upcomingToday.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [upcomingToday.length]);

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
  }, [user, initialSelectedDate]);

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
        .order('due_date', { ascending: true });

      if (data) {
        setTasks(data.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          title: t.title,
          description: t.description,
          dueDate: t.due_date,
          isCompleted: t.is_completed,
          createdAt: t.created_at,
          googleTaskId: t.google_task_id,
          googleCalendarEventId: t.google_calendar_event_id
        })));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleTaskUpdate = async (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));

    if (updated.googleTaskId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.provider_token;
        if (token) {
          await updateGoogleTask(updated.googleTaskId, {
            status: updated.isCompleted ? 'completed' : 'needsAction'
          }, token);
        }
      } catch (err) {
        console.error('Failed to sync task update to Google', err);
      }
    }
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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('creator_id', user?.id)
      .order('created_at', { ascending: false });
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
        creatorId: e.creator_id,
        googleCalendarEventId: e.google_calendar_event_id
      }));
      setAllEvents(mappedEvents);

      const todayStr = new Date().toISOString().split('T')[0];
      setUpcomingToday(mappedEvents.filter(e => e.date === todayStr));
    }

    syncGoogleTasks();
    syncGoogleEvents();
  };

  const syncGoogleEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;
      if (!providerToken) return;

      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      const end = new Date();
      end.setMonth(end.getMonth() + 6);

      const googleEvents = await listCalendarEvents(providerToken, start.toISOString(), end.toISOString());

      const localEventsToCheck = allEvents.filter(e => {
        if (!e.googleCalendarEventId) return false;
        const eDate = new Date(e.date);
        return eDate >= start && eDate <= end;
      });

      for (const localEvent of localEventsToCheck) {
        const existsInGoogle = googleEvents.find((ge: any) => ge.id === localEvent.googleCalendarEventId);
        if (!existsInGoogle) {
          await supabase.from('events').delete().eq('id', localEvent.id);
          setAllEvents(prev => prev.filter(e => e.id !== localEvent.id));
        }
      }
    } catch (err) {
      console.error('Event Sync Error', err);
    }
  };

  const syncGoogleTasks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;
      if (!providerToken) return;

      const googleTasks = await listGoogleTasks(providerToken);

      const { data: localTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_completed', false);

      if (localTasks && googleTasks) {
        const isListTruncated = googleTasks.length === 100;
        for (const localTask of localTasks) {
          if (localTask.google_task_id) {
            const googleTask = googleTasks.find((gt: any) => gt.id === localTask.google_task_id);
            if (!googleTask) {
              if (!isListTruncated) {
                await supabase.from('tasks').delete().eq('id', localTask.id);
              }
            } else {
              if (googleTask.status === 'completed') {
                await supabase.from('tasks').update({ is_completed: true }).eq('id', localTask.id);
              }
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
      const { data: eventData } = await supabase
        .from('events')
        .select('google_calendar_event_id')
        .eq('id', eventToDelete)
        .single();

      if (eventData?.google_calendar_event_id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const providerToken = session?.provider_token;
          if (providerToken) {
            await deleteCalendarEvent(eventData.google_calendar_event_id, providerToken);
          } else {
            alert('Note: Could not delete from Google Calendar (Session expired). Please re-login.');
          }
        } catch (googleError: any) {
          alert(`Failed to delete from Google Calendar: ${googleError.message}`);
        }
      }

      const { error } = await supabase.from('events').delete().eq('id', eventToDelete);
      if (error) throw error;
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
    if (!window.confirm("Delete this task?")) return;

    try {
      const { data: taskData } = await supabase.from('tasks').select('google_task_id, google_calendar_event_id').eq('id', taskId).single();
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;

      if (providerToken) {
        if (taskData?.google_task_id) {
          try {
            await deleteGoogleTask(taskData.google_task_id, providerToken);
          } catch (err: any) {
            alert(`Failed to sync task deletion: ${err.message}`);
          }
        }
        if (taskData?.google_calendar_event_id) {
          try {
            await deleteCalendarEvent(taskData.google_calendar_event_id, providerToken);
          } catch (err: any) {
            alert(`Failed to delete Calendar Event for Task: ${err.message}`);
          }
        }
      } else {
        alert('Note: Could not sync deletion to Google (Session expired). Please re-login.');
      }

      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskId));
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

  // Helper: check if a date scroller date has events/tasks
  const dateHasActivity = (d: Date) => {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hasEvent = allEvents.some(e => e.date === dateStr);
    const hasTask = tasks.some(t => t.dueDate?.startsWith(dateStr));
    return { hasEvent, hasTask };
  };

  // Progress ring helper
  const taskProgress = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  return (
    <div className="pb-24 relative max-w-7xl mx-auto w-full min-h-screen bg-[#0a0a0a] shadow-sm">
      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/10">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Event?</h3>
                <p className="text-sm text-gray-400 font-medium">This action cannot be undone.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button
                  onClick={() => setEventToDelete(null)}
                  disabled={isDeleting}
                  className="w-full py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/15 transition-colors border border-white/5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh] border border-white/10">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="text-lg font-bold text-white">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-2">
                <button onClick={viewPrevMonth} className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-300">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button onClick={viewNextMonth} className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-300">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
                <button onClick={() => setIsCalendarOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-red-400">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-xs font-bold text-gray-500 py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 place-items-center shrink-0">
              {Array.from({ length: getDaysInMonth(currentMonth).firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="size-10"></div>
              ))}
              {Array.from({ length: getDaysInMonth(currentMonth).days }).map((_, i) => {
                const day = i + 1;
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
                        ? 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white scale-110 shadow-lg shadow-teal-400/30 z-10'
                        : isToday
                          ? 'bg-white/10 text-white'
                          : (hasActivity ? 'bg-white/5 text-white font-bold' : 'hover:bg-white/5 text-gray-400')
                      }
                    `}
                  >
                    <span>{day}</span>
                    <div className="flex gap-0.5 absolute bottom-1.5">
                      {hasEvent && <div className="size-1 bg-teal-400 rounded-full"></div>}
                      {hasTask && <div className="size-1 bg-emerald-400 rounded-full"></div>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Date Events */}
            <div className="mt-6 pt-6 border-t border-white/10 overflow-y-auto min-h-[100px]">
              <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">
                {selectedDate ? new Date(selectedDate).toLocaleDateString('default', { month: 'long', day: 'numeric' }) : 'Select a date'}
              </h4>

              {selectedDate ? (
                (() => {
                  const dayEvents = allEvents.filter(e => e.date === selectedDate);
                  const dayTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(selectedDate));

                  if (dayEvents.length === 0 && dayTasks.length === 0) {
                    return <p className="text-sm text-gray-500 text-center py-4">No events or tasks scheduled.</p>;
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      {dayEvents.map(event => (
                        <div key={event.id} className="flex items-center gap-3 p-2 bg-white/5 border border-white/5 rounded-xl">
                          <div
                            className="size-10 rounded-lg bg-cover bg-center shrink-0"
                            style={{ backgroundImage: `url("${event.imageUrl}")` }}
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-bold text-white truncate">{event.title}</h5>
                            <p className="text-xs text-teal-400 font-medium">{formatTime(event.time)} • Event</p>
                          </div>
                        </div>
                      ))}
                      {dayTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                          <div className={`size-3 rounded-full border-[3px] ${task.isCompleted ? 'bg-emerald-400 border-emerald-400' : 'border-gray-500'}`} />
                          <div className="flex-1 min-w-0">
                            <h5 className={`text-sm font-bold truncate ${task.isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>{task.title}</h5>
                            <p className="text-xs text-emerald-400 font-medium">Task</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); confirmTaskDelete(task.id); }}
                            className="p-2 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 transition-colors shrink-0"
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
                <p className="text-sm text-gray-500 text-center py-4">Tap a date to see agenda.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* ✨ 1. ANIMATED GRADIENT ACCENT BAR        */}
      {/* ========================================= */}
      <div className="animate-gradient-bar h-[3px] w-full sticky top-0 z-50" />

      {/* ========================================= */}
      {/* ✨ 2. DARK GLASSMORPHISM HEADER           */}
      {/* ========================================= */}
      <div className="sticky top-[3px] z-40">
        <div
          className="mx-3 mt-3 rounded-2xl p-4 dark-glass-header shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div
                  className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 ring-2 ring-white/20 shadow-md"
                  style={{ backgroundImage: `url("${user?.avatar || 'https://ui-avatars.com/api/?name=User'}")` }}
                />
                <div className="absolute bottom-0 right-0 size-3.5 bg-emerald-400 border-[2.5px] border-[#1a1a1a] rounded-full animate-pulse-dot"></div>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-semibold tracking-wide uppercase">Welcome back</p>
                <h2 className="text-white text-xl font-extrabold leading-tight">{user?.name}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative flex items-center justify-center rounded-full size-11 transition-all hover:scale-105 active:scale-95 shadow-sm ${showNotifications ? 'bg-white text-black' : 'bg-white/10 text-white border border-white/10'}`}
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-2 right-2.5 size-2 bg-red-500 rounded-full border border-[#1a1a1a]"></span>
              </button>
            </div>
          </div>
          <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-5 mt-4">
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors">
            <span className="material-symbols-outlined">search</span>
          </span>
          <input
            className="w-full h-12 pl-12 pr-4 dark-search-input rounded-2xl text-white placeholder-gray-500 font-medium"
            placeholder="Search events..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>


      {/* ========================================= */}
      {/* ✨ 10. HERO BANNER CAROUSEL (Happening Today) */}
      {/* ========================================= */}
      {!showAllFeatured && upcomingToday.length > 0 && (
        <section className="px-4 mt-2">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Happening Today</h3>
          <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-black/30" style={{ minHeight: 200 }}>
            {upcomingToday.map((event, idx) => (
              <div
                key={event.id}
                className={`absolute inset-0 transition-all duration-700 ${idx === heroIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url("${event.imageUrl}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                  <h4 className="text-2xl font-extrabold leading-tight mb-1">{event.title}</h4>
                  <div className="flex items-center gap-4 text-white/70 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span>{formatTime(event.time)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span className="truncate max-w-[150px]">{event.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="relative opacity-0 pointer-events-none p-6" style={{ minHeight: 200 }}>
              <div className="h-full"></div>
            </div>
            {upcomingToday.length > 1 && (
              <div className="absolute bottom-3 right-4 flex gap-1.5 z-10">
                {upcomingToday.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHeroIndex(idx)}
                    className={`rounded-full transition-all duration-300 ${idx === heroIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Events */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="text-xl font-bold text-white">Featured Events</h2>
          <button
            onClick={() => setShowAllFeatured(!showAllFeatured)}
            className="text-sm font-bold text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-0.5"
          >
            {showAllFeatured ? 'Show Less' : 'See All'} <span className="material-symbols-outlined text-[16px]">{showAllFeatured ? 'expand_less' : 'chevron_right'}</span>
          </button>
        </div>

        {featuredEvents.length === 0 ? (
          <div className="px-5 text-gray-500 text-sm">No events found.</div>
        ) : (
          <div className={`px-5 ${showAllFeatured ? 'grid grid-cols-1 gap-5' : 'flex overflow-x-auto hide-scrollbar gap-5 pb-4 snap-x snap-mandatory'}`}>
            {featuredEvents.map((event) => (
              <div key={event.id} className={`snap-center shrink-0 ${showAllFeatured ? 'w-full' : 'w-[88%] max-w-[340px]'} relative aspect-[16/10] group cursor-pointer shadow-lg shadow-black/30 hover:shadow-xl transition-all duration-300 active:scale-95`}>
                <div className="absolute inset-0 rounded-3xl overflow-hidden transform-gpu">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 group-active:scale-110"
                    style={{ backgroundImage: `url("${event.imageUrl}")` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute bottom-0 left-0 w-full p-5 flex flex-col gap-1.5">
                    <h3 className="text-white text-2xl font-bold leading-tight">{event.title}</h3>
                    <div className="flex items-center gap-4 text-white/80 text-xs font-medium">
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

                <div className="absolute inset-0 z-10 pointer-events-none">
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

      {/* ========================================= */}
      {/* ✨ 7. QUICK ACTIONS AS FLOATING BUBBLES   */}
      {/* ========================================= */}
      {!showAllFeatured && (
        <section className="px-5 py-8 mt-4">
          <h3 className="text-white text-lg font-bold mb-5">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-6 place-items-center">
            <button onClick={() => setIsCalendarOpen(true)} className="flex flex-col items-center gap-2.5 group animate-bubble">
              <div className="size-[68px] rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-teal-400/20 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <span className="material-symbols-outlined text-[28px]">calendar_month</span>
              </div>
              <span className="text-xs font-semibold text-gray-300">Calendar</span>
            </button>
            <button onClick={() => setShowTicketsModal(true)} className="flex flex-col items-center gap-2.5 group animate-bubble animate-bubble-delay-1">
              <div className="size-[68px] rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-400/20 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <span className="material-symbols-outlined text-[28px]">confirmation_number</span>
              </div>
              <span className="text-xs font-semibold text-gray-300">Tickets</span>
            </button>
            <button className="flex flex-col items-center gap-2.5 group animate-bubble animate-bubble-delay-2">
              <div className="size-[68px] rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center shadow-lg shadow-violet-400/20 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <span className="material-symbols-outlined text-[28px]">groups</span>
              </div>
              <span className="text-xs font-semibold text-gray-300">Invites</span>
            </button>
          </div>
        </section>
      )}

      {/* ========================================= */}
      {/* ✨ 5. STATS DASHBOARD STRIP               */}
      {/* ========================================= */}
      {!showAllFeatured && (
        <section className="px-4 mt-2 animate-fade-slide-up">
          <div className="grid grid-cols-3 gap-3">
            <div className="dark-stat-card">
              <div className="flex justify-center mb-1.5">
                <span className="material-symbols-outlined text-[22px] text-teal-400">event</span>
              </div>
              <p className="text-2xl font-extrabold text-white">{stats.eventsThisWeek}</p>
              <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider mt-0.5">This Week</p>
            </div>
            <div className="dark-stat-card">
              <div className="flex justify-center mb-1.5">
                <span className="material-symbols-outlined text-[22px] text-amber-400">task_alt</span>
              </div>
              <p className="text-2xl font-extrabold text-white">{stats.pendingTasks}</p>
              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mt-0.5">Pending</p>
            </div>
            <div className="dark-stat-card">
              <div className="flex justify-center mb-1.5">
                <span className="material-symbols-outlined text-[22px] text-emerald-400">check_circle</span>
              </div>
              <p className="text-2xl font-extrabold text-white">{stats.completedTasks}</p>
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mt-0.5">Done</p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================= */}
      {/* ✨ 3. HORIZONTAL DATE SCROLLER            */}
      {/* ========================================= */}
      {!showAllFeatured && (
        <div className="mt-8 px-3">
          <div
            ref={dateScrollerRef}
            className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory"
          >
            {dateScrollerDates.map((d, i) => {
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              const isToday = d.toDateString() === new Date().toDateString();
              const { hasEvent, hasTask } = dateHasActivity(d);
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`snap-center shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl min-w-[52px] transition-all duration-200
                    ${isSelected
                      ? 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg shadow-teal-400/20 scale-105'
                      : isToday
                        ? 'bg-white/10 text-white border border-white/15'
                        : 'bg-[#1a1a1a] text-gray-400 border border-white/5 hover:border-white/15'
                    }
                  `}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-teal-200' : 'text-gray-500'}`}>
                    {dayNames[d.getDay()]}
                  </span>
                  <span className={`text-lg font-extrabold ${isSelected ? 'text-white' : ''}`}>
                    {d.getDate()}
                  </span>
                  <div className="flex gap-1">
                    {hasEvent && <div className={`size-1.5 rounded-full ${isSelected ? 'bg-teal-200' : 'bg-teal-400'}`}></div>}
                    {hasTask && <div className={`size-1.5 rounded-full ${isSelected ? 'bg-emerald-200' : 'bg-emerald-400'}`}></div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* ✨ 9. TASKS WITH PROGRESS RING            */}
      {/* ========================================= */}
      {!showAllFeatured && (
        <section className="px-5 mt-4">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-white">Tasks & Agenda</h3>
            <button className="text-sm font-bold text-teal-400 hover:text-teal-300 transition-colors">View All</button>
          </div>

          {/* Progress Ring + Summary */}
          {stats.totalTasks > 0 && (
            <div className="flex items-center gap-5 mb-5 p-4 bg-[#1a1a1a] rounded-2xl border border-white/5">
              <div className="relative shrink-0">
                <svg width="80" height="80" className="transform -rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="#2a2a2a" strokeWidth="6" fill="none" />
                  <circle
                    cx="40" cy="40" r="34"
                    stroke="#0d9488"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 - (taskProgress / 100) * 2 * Math.PI * 34}`}
                    className="progress-ring-circle"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-extrabold text-white">{Math.round(taskProgress)}%</span>
                </div>
              </div>
              <div>
                <p className="text-white font-bold text-base">
                  {stats.completedTasks} of {stats.totalTasks} tasks done
                </p>
                <p className="text-teal-400 text-sm font-medium mt-0.5">
                  {stats.pendingTasks === 0 ? '🎉 All caught up!' : `${stats.pendingTasks} task${stats.pendingTasks > 1 ? 's' : ''} remaining`}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {tasks.filter(t => !t.isCompleted).length === 0 ? (
              <p className="text-gray-500 text-sm">No tasks pending. Great job! 🎉</p>
            ) : (
              tasks.filter(t => !t.isCompleted).slice(0, 3).map(task => (
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
      )}

      {showTicketsModal && <TicketsListModal onClose={() => setShowTicketsModal(false)} />}

      {/* Recommended (at very bottom) */}
      {!showAllFeatured && recommendedEvents.length > 0 && (
        <section className="px-5 mt-8 border-t border-white/5 pt-8">
          <h3 className="text-lg font-bold text-white mb-5">Recommended For You</h3>
          <div className="flex flex-col gap-4">
            {recommendedEvents.map((event) => (
              <div key={event.id} className="bg-[#1a1a1a] p-3 rounded-2xl flex gap-4 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                <div
                  className="w-24 aspect-square rounded-xl bg-cover bg-center shrink-0 relative overflow-hidden"
                  style={{ backgroundImage: `url("${event.imageUrl}")` }}
                />
                <div className="flex flex-col justify-between py-1 flex-1">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${event.category === 'Wellness' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : 'text-teal-400 bg-teal-400/10 border border-teal-400/20'
                        }`}>
                        {event.category}
                      </span>
                      <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">near_me</span>
                        {event.distance}
                      </span>

                      <div className="ml-auto flex items-center gap-1">
                        <ReminderButton eventId={event.id} googleEventId={event.googleCalendarEventId} className="scale-90" />
                        {/* @ts-ignore */}
                        {user?.id === event.creatorId && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEventToDelete(event.id); }}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <h4 className="text-white font-bold text-[15px] leading-snug line-clamp-2">{event.title}</h4>
                    <p className="text-gray-500 text-xs font-medium mt-1">{event.date} • {formatTime(event.time)}</p>
                  </div>
                  {event.attendeesCount && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex -space-x-2 overflow-hidden">
                        {event.attendeesAvatars?.map((av, i) => (
                          <img key={i} src={av} className="inline-block size-5 rounded-full ring-2 ring-[#1a1a1a] object-cover" alt="User" />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500 font-semibold">+{event.attendeesCount} going</span>
                    </div>
                  )}
                  {event.id === 'r2' && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-white font-semibold flex items-center gap-1 bg-yellow-500/10 px-1.5 py-0.5 rounded-md border border-yellow-500/20">
                        <span className="material-symbols-outlined text-[12px] text-amber-400 fill-amber-400">star</span>
                        4.9
                      </span>
                      <span className="text-[10px] text-gray-500">(120 reviews)</span>
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
