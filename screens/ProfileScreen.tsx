
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
  const [stats, setStats] = useState({ hosted: 0, upcoming: 0, past: 0 });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  // Sync state when user loads
  React.useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditOccupation(user.occupation || 'Member');
      fetchStats();
    }
  }, [user]);

  const preferences = [
    { name: 'Notifications', icon: 'notifications' },
    { name: 'Privacy & Data', icon: 'lock' },
    { name: 'Linked Accounts', icon: 'link' }
  ];



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

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: (await supabase.auth.getUser()).data.user?.id,
          avatar_url: data.publicUrl
        });

      if (updateError) {
        throw updateError;
      }

      // Refresh profile to update UI instantly
      await refreshProfile();
      alert('Avatar updated successfully!');

    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Hosted: Total events created by user
      const { count: hostedCount, error: hostedError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user?.id);

      // Upcoming: Created by user, Date >= Today
      const { count: upcomingCount, error: upcomingError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user?.id)
        .gte('date', today);

      // Past: Created by user, Date < Today
      const { count: pastCount, error: pastError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user?.id)
        .lt('date', today);

      // Recent Activity (Last 5 events)
      const { data: recentData, error: recentError } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentData) {
        // Map to Event type (simplified)
        const mappedRecent: any[] = recentData.map(e => ({
          id: e.id,
          title: e.title,
          imageUrl: e.image_url || 'https://picsum.photos/seed/event/800/600',
          location: e.location,
          date: e.date
        }));
        setRecentEvents(mappedRecent);
      }

      if (hostedError || upcomingError || pastError || recentError) console.error('Error fetching stats');

      setStats({
        hosted: hostedCount || 0,
        upcoming: upcomingCount || 0,
        past: pastCount || 0
      });

    } catch (e) {
      console.error(e);
    }
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
      <div className="flex flex-col items-center pt-8 pb-10 px-6 bg-white">
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

      {/* Stats */}
      <div className="px-5 mt-[-1rem] relative z-10 mb-10">
        <div className="flex gap-4 justify-between">
          {[
            { label: 'Hosted', val: stats.hosted },
            { label: 'Upcoming', val: stats.upcoming },
            { label: 'Past', val: stats.past }
          ].map(stat => (
            <div key={stat.label} className="flex flex-1 flex-col items-center justify-center bg-white py-4 px-2 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-black">{stat.val}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div className="mb-10">
        <div className="flex items-center justify-between px-6 mb-4">
          <h3 className="text-lg font-bold tracking-tight text-black">Recent Activity</h3>
          <button className="text-black text-xs font-bold uppercase tracking-wide hover:underline">See All</button>
        </div>

        {recentEvents.length === 0 ? (
          <div className="px-6 text-gray-400 text-sm">No recent activity.</div>
        ) : (
          <div className="overflow-x-auto pb-4 px-6 hide-scrollbar flex gap-4 snap-x snap-mandatory">
            {recentEvents.map((event) => (
              <div key={event.id} className="snap-center shrink-0 w-[280px] bg-white rounded-3xl p-3 border border-gray-100 shadow-sm">
                <div className="relative w-full aspect-[16/9] rounded-2xl bg-cover bg-center mb-3 overflow-hidden" style={{ backgroundImage: `url("${event.imageUrl}")` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-black shadow-sm uppercase tracking-wide">Hosted</div>
                </div>
                <div className="px-1 pb-1">
                  <h4 className="font-bold text-black truncate text-base">{event.title}</h4>
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mt-1.5 font-medium">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <span>{event.location} • {event.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Sections */}
      <div className="px-5 space-y-8">
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
          className="w-full bg-white text-black text-[15px] font-bold p-4 rounded-3xl border-2 border-black hover:bg-black hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group shadow-sm mb-12"
        >
          <span className="material-symbols-outlined group-hover:text-white">logout</span>
          Log Out
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;
