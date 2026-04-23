
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';


const ProfileScreen: React.FC = () => {
  const { user, logout, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editOccupation, setEditOccupation] = useState(user?.occupation || 'Member');
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'Recent' | 'Hosted' | 'Upcoming' | 'Past'>('Recent');
  const [eventList, setEventList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [stats, setStats] = useState({ hosted: 0, upcoming: 0, past: 0 });

  const preferences = [
    { name: 'Notifications', icon: 'notifications' },
    { name: 'Privacy & Data', icon: 'lock' },
    { name: 'Linked Accounts', icon: 'link' }
  ];

  // Sync state when user loads
  React.useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditOccupation(user.occupation || 'Member');
      fetchStats();
      fetchEvents('Recent'); // Initial load
    }
  }, [user]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update profile in DB
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: (await supabase.auth.getUser()).data.user?.id,
          avatar_url: data.publicUrl
        });

      if (updateError) throw updateError;

      // Update Auth Metadata (Backup for session)
      await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl }
      });

      // Refresh profile to update UI instantly
      await refreshProfile();
      alert('Avatar updated successfully!');

    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchEvents = async (tab: string) => {
    try {
      setListLoading(true);
      setActiveTab(tab as any);

      const today = new Date().toISOString().split('T')[0];
      let query = supabase.from('events').select('*').eq('creator_id', user?.id);

      if (tab === 'Recent') {
        query = query.order('created_at', { ascending: false }).limit(5);
      } else if (tab === 'Hosted') {
        query = query.order('date', { ascending: false }); // All events
      } else if (tab === 'Upcoming') {
        query = query.gte('date', today).order('date', { ascending: true });
      } else if (tab === 'Past') {
        query = query.lt('date', today).order('date', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        setEventList(data.map(e => ({
          id: e.id,
          title: e.title,
          imageUrl: e.image_url || 'https://picsum.photos/seed/event/800/600',
          location: e.location,
          date: e.date
        })));
      }
    } catch (error) {
      console.error("Fetch events error:", error);
    } finally {
      setListLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // Parallel fetches for speed
      const [hosted, upcoming, past] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('creator_id', user?.id),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('creator_id', user?.id).gte('date', today),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('creator_id', user?.id).lt('date', today)
      ]);

      setStats({
        hosted: hosted.count || 0,
        upcoming: upcoming.count || 0,
        past: past.count || 0
      });
    } catch (e) { console.error(e); }
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName,
          occupation: editOccupation,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      // Update Auth Metadata
      await supabase.auth.updateUser({
        data: { full_name: editName }
      });

      alert('Profile updated successfully!');
      setIsEditing(false);
      await refreshProfile();
    } catch (error: any) {
      alert(`Error updating profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteAvatar = async () => {
    try {
      if (!confirm('Are you sure you want to remove your profile picture?')) return;

      setUploading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshProfile();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-surface pb-28 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="flex items-center justify-between p-4 h-14">
          <button className="flex size-10 items-center justify-center rounded-full hover:bg-black/5">
            <span className="material-symbols-outlined text-black font-semibold">arrow_back</span>
          </button>
          <h2 className="text-base font-bold tracking-tight uppercase text-black">Profile</h2>
          {isEditing ? (
            <button
              onClick={() => setIsEditing(false)}
              className="text-sm font-bold text-red-500 hover:bg-red-50 px-3 py-1 rounded-full transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button className="flex size-10 items-center justify-center rounded-full hover:bg-black/5">
              <span className="material-symbols-outlined text-black font-semibold">more_horiz</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="flex flex-col items-center pt-8 pb-6 px-6 bg-white">
        <div className="relative mb-8 group">
          <div className="h-32 w-32 rounded-full p-1 bg-white shadow-lg ring-1 ring-black/5 overflow-hidden mx-auto">
            {user?.avatar ? (
              <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url("${user.avatar}")` }} />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-gray-400">person</span>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-4 justify-center mt-6">
              <label className="flex flex-col items-center gap-1 cursor-pointer group/btn">
                <div className="size-12 rounded-full bg-black text-white flex items-center justify-center shadow-md group-hover/btn:bg-gray-800 transition-colors">
                  {uploading ? (
                    <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-black uppercase tracking-wide">Change</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {user?.avatar && (
                <button
                  onClick={deleteAvatar}
                  className="flex flex-col items-center gap-1 group/btn"
                >
                  <div className="size-12 rounded-full bg-white border border-gray-200 text-red-500 flex items-center justify-center shadow-sm group-hover/btn:bg-red-50 group-hover/btn:border-red-100 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </div>
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Remove</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center w-full max-w-sm px-4">
          {isEditing ? (
            <div className="w-full space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className='w-full'>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 rounded-2xl font-bold text-lg text-black outline-none transition-all placeholder:text-gray-300"
                  placeholder="Your Name"
                />
              </div>
              <div className='w-full'>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-2 ml-1">Occupation</label>
                <input
                  value={editOccupation}
                  onChange={(e) => setEditOccupation(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 rounded-2xl font-semibold text-base text-gray-700 outline-none transition-all placeholder:text-gray-300"
                  placeholder="What do you do?"
                />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-black">{user?.name}</h1>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{user?.occupation || 'Member'}</span>
              </div>
            </div>
          )}
        </div>

        {isEditing ? (
          <button
            onClick={saveProfile}
            disabled={loading}
            className="mt-8 w-full max-w-xs bg-black text-white font-bold py-3.5 px-6 rounded-full shadow-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-70"
          >
            {loading ? (
              <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                <span>Save Changes</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="mt-8 w-full max-w-xs bg-black text-white font-bold py-3.5 px-6 rounded-full shadow-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">edit_square</span>
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Stats (Tabs) */}
      <div className="px-5 mt-[-1rem] relative z-10 mb-4">
        <div className="flex gap-4 justify-between">
          {[
            { label: 'Hosted', val: stats.hosted, id: 'Hosted' },
            { label: 'Upcoming', val: stats.upcoming, id: 'Upcoming' },
            { label: 'Past', val: stats.past, id: 'Past' }
          ].map(stat => (
            <button
              key={stat.label}
              onClick={() => fetchEvents(stat.id)}
              className={`flex flex-1 flex-col items-center justify-center py-4 px-2 rounded-2xl shadow-sm border transition-all duration-300 active:scale-95 ${activeTab === stat.id ? 'bg-black border-black transform scale-[1.02] shadow-md' : 'bg-white border-gray-100 hover:border-gray-200'}`}
            >
              <p className={`text-2xl font-bold ${activeTab === stat.id ? 'text-white' : 'text-black'}`}>{stat.val}</p>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${activeTab === stat.id ? 'text-white/70' : 'text-gray-400'}`}>{stat.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Activity / List Section */}
      <div className="mb-2 min-h-0">
        <div className="flex items-center justify-between px-6 mb-4">
          <h3 className="text-lg font-bold tracking-tight text-black flex items-center gap-2">
            {activeTab === 'Recent' ? 'Recent Activity' : `${activeTab} Events`}
            {listLoading && <span className="size-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>}
          </h3>
          {activeTab !== 'Recent' && (
            <button onClick={() => fetchEvents('Recent')} className="text-black text-xs font-bold uppercase tracking-wide hover:underline">Clear Filter</button>
          )}
        </div>

        {eventList.length === 0 ? (
          <div className="px-6 flex flex-col items-center justify-center py-12 text-gray-400 bg-white mx-5 rounded-3xl border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
            <p className="text-sm font-medium">No {activeTab.toLowerCase()} events found.</p>
          </div>
        ) : (
          <div className={activeTab === 'Recent'
            ? "overflow-x-auto pb-4 px-6 hide-scrollbar flex gap-4 snap-x snap-mandatory"
            : "px-5 grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
          }>
            {eventList.map((event) => (
              <div key={event.id} className={`${activeTab === 'Recent' ? 'snap-center shrink-0 w-[280px] aspect-[16/10]' : 'w-full aspect-[2/1]'} relative rounded-3xl overflow-hidden shadow-lg border border-gray-100 group cursor-pointer transition-transform active:scale-95`}>
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url("${event.imageUrl}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm uppercase tracking-wide">
                  Event
                </div>

                <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-black bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full uppercase tracking-wide">
                      <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                      {event.date}
                    </span>
                  </div>
                  <h4 className="text-white font-bold text-lg leading-tight truncate">{event.title}</h4>
                  <div className="flex items-center gap-1.5 text-gray-200 text-xs font-medium">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Sections */}
      <div className="px-5 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4 mb-3">Preferences</h3>
          <div className="bg-white rounded-3xl overflow-hidden shadow-soft border border-gray-100">
            {preferences.map((item, idx) => (
              <button key={item.name} className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group ${idx < preferences.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="size-9 rounded-xl bg-gray-50 border border-gray-100 text-black flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <span className="text-[15px] font-semibold text-black">{item.name}</span>
                </div>
                <span className="material-symbols-outlined text-gray-300 group-hover:text-black transition-colors text-[20px]">arrow_forward_ios</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full bg-white text-black text-[15px] font-bold p-4 rounded-3xl border-2 border-black hover:bg-black hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group shadow-sm mb-6 active:scale-95"
        >
          <span className="material-symbols-outlined group-hover:text-white">logout</span>
          Log Out
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;
