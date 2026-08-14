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
    { name: 'Notifications', icon: 'notifications', color: 'text-teal-600 bg-teal-50' },
    { name: 'Privacy & Data', icon: 'lock', color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Linked Accounts', icon: 'link', color: 'text-cyan-600 bg-cyan-50' }
  ];

  React.useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditOccupation(user.occupation || 'Member');
      fetchStats();
      fetchEvents('Recent');
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

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: (await supabase.auth.getUser()).data.user?.id,
          avatar_url: data.publicUrl
        });

      if (updateError) throw updateError;

      await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl }
      });

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
        query = query.order('date', { ascending: false });
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
    <div className="bg-[#f0fdfa] min-h-screen pb-28 text-slate-800 font-sans">
      
      {/* Neat Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-teal-100 shadow-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#14312A] tracking-tight">Profile</h1>
        {isEditing ? (
          <button onClick={() => setIsEditing(false)} className="text-sm font-semibold text-red-500 bg-red-50 px-4 py-1.5 rounded-full">
            Cancel
          </button>
        ) : (
          <button className="flex items-center justify-center p-2 rounded-full text-teal-700 bg-teal-50 hover:bg-teal-100">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        )}
      </header>

      {/* Main Container */}
      <div className="max-w-md mx-auto w-full pt-6 px-5 space-y-8">
        
        {/* Profile Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-teal-50 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 w-full h-24 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-t-[2rem]"></div>
          
          <div className="relative mt-8 mb-4">
            <div className="h-28 w-28 rounded-full border-4 border-white shadow-lg bg-teal-50 overflow-hidden relative z-10 flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-teal-300">person</span>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="w-full space-y-4 px-2 mt-4">
              <div className="flex justify-center gap-4 mb-4">
                <label className="flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-bold cursor-pointer hover:bg-teal-100 transition-colors">
                  {uploading ? (
                    <span className="size-4 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin"></span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  )}
                  Change
                  <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
                </label>
                {user?.avatar && (
                  <button onClick={deleteAvatar} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-red-100 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Remove
                  </button>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-transparent font-bold text-lg text-slate-800 outline-none placeholder:text-slate-300"
                  placeholder="Your Name"
                />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Occupation</label>
                <input
                  value={editOccupation}
                  onChange={(e) => setEditOccupation(e.target.value)}
                  className="w-full bg-transparent font-semibold text-base text-slate-600 outline-none placeholder:text-slate-300"
                  placeholder="What do you do?"
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={loading}
                className="w-full bg-[#14312A] text-white font-bold py-3.5 rounded-2xl shadow-lg mt-4 hover:bg-teal-900 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="w-full">
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">{user?.name}</h2>
              <p className="text-sm font-semibold text-teal-600 mt-1">{user?.occupation || 'Member'}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-5 w-full max-w-[200px] mx-auto bg-slate-50 text-slate-700 font-bold py-2.5 rounded-full border border-slate-200 hover:bg-slate-100 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">edit_square</span>
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Stats Strip */}
        {!isEditing && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Hosted', val: stats.hosted, id: 'Hosted' },
              { label: 'Upcoming', val: stats.upcoming, id: 'Upcoming' },
              { label: 'Past', val: stats.past, id: 'Past' }
            ].map(stat => (
              <button
                key={stat.label}
                onClick={() => fetchEvents(stat.id)}
                className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-300 active:scale-95 ${activeTab === stat.id ? 'bg-[#14312A] border-[#14312A] shadow-md shadow-teal-900/20' : 'bg-white border-teal-50 shadow-sm hover:border-teal-200'}`}
              >
                <p className={`text-2xl font-extrabold ${activeTab === stat.id ? 'text-white' : 'text-slate-800'}`}>{stat.val}</p>
                <p className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${activeTab === stat.id ? 'text-teal-200' : 'text-slate-500'}`}>{stat.label}</p>
              </button>
            ))}
          </div>
        )}


        {/* Preferences */}
        {!isEditing && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-2">Preferences</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-teal-50 overflow-hidden divide-y divide-teal-50">
              {preferences.map((item) => (
                <button key={item.name} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-xl flex items-center justify-center ${item.color}`}>
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    </div>
                    <span className="font-bold text-slate-800 text-[15px]">{item.name}</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 text-[20px]">chevron_right</span>
                </button>
              ))}
            </div>

            <button onClick={logout} className="mt-6 w-full bg-black text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors active:scale-95 shadow-lg shadow-black/20">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileScreen;
