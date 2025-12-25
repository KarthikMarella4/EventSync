import React, { useState, useEffect } from 'react';
import { FEATURED_EVENTS, RECOMMENDED_EVENTS } from '../constants'; // Fallback
import { Event, Screen } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);

  // Delete Modal State
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

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
      // Split for demo: first 5 featured, rest recommended
      setFeaturedEvents(mappedEvents.slice(0, 5));
      setRecommendedEvents(mappedEvents.slice(5));
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    setIsDeleting(true);
    const { error } = await supabase.from('events').delete().eq('id', eventToDelete);
    setIsDeleting(false);

    if (error) {
      alert('Failed to delete: ' + error.message); // Keep alert for error to be visible
    } else {
      // Success
      setFeaturedEvents(prev => prev.filter(e => e.id !== eventToDelete));
      setRecommendedEvents(prev => prev.filter(e => e.id !== eventToDelete));
      setEventToDelete(null);
    }
  };

  return (
    <div className="pb-24 relative">
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

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-transparent">
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
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-black transition-colors">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input
              className="w-full h-12 pl-12 pr-4 bg-surface border border-border-light rounded-2xl outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 text-text-main placeholder-text-muted transition-all shadow-sm font-medium"
              placeholder="Search events, people, or venues..."
              type="text"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-muted hover:bg-gray-200 transition">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Events */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="text-xl font-bold text-text-main">Featured Events</h2>
          <button className="text-sm font-bold text-secondary hover:text-secondary/80 transition-colors flex items-center gap-0.5">
            See All <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {featuredEvents.length === 0 ? (
          <div className="px-5 text-gray-400 text-sm">No events found. Create one!</div>
        ) : (
          <div className="flex overflow-x-auto hide-scrollbar px-5 gap-5 pb-4 snap-x snap-mandatory">
            {featuredEvents.map((event) => (
              <div key={event.id} className="snap-center shrink-0 w-[88%] max-w-[340px] relative rounded-3xl overflow-hidden aspect-[16/10] group cursor-pointer shadow-lg shadow-black/10 hover:shadow-xl transition-shadow">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url("${event.imageUrl}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Delete Button for Owner */}
                {/* @ts-ignore - casting for quick fix as we added creatorId dynamically */}
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
                      <span>{event.date} • {event.time}</span>
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
      <section className="px-5 mt-8">
        <h3 className="text-text-main text-lg font-bold mb-5">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4">
          <button className="flex flex-col items-center gap-2.5 group">
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

      {/* Recommended */}
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
                  <p className="text-text-muted text-xs font-medium mt-1">{event.date} • {event.time}</p>
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
    </div>
  );
};

export default HomeScreen;
