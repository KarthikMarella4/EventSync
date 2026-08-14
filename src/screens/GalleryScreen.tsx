import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const GalleryScreen: React.FC = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('Recent');

  useEffect(() => {
    fetchPhotos();

    const channel = supabase
      .channel('gallery_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_photos' }, () => {
        fetchPhotos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPhotos = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('event_photos')
        .select(`
            id,
            photo_url,
            created_at,
            user_id,
            events (title),
            profiles:user_id (full_name, avatar_url, username)
            `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let mappedUploads: any[] = [];
      if (data) {
        mappedUploads = data.map((p: any) => ({
          id: p.id,
          url: p.photo_url,
          title: p.events?.title || 'Unknown Event',
          type: 'Upload',
          userId: p.user_id,
          createdAt: new Date(p.created_at).getTime(),
          user: {
            handle: p.profiles?.username || p.profiles?.full_name || 'User',
            avatar: p.profiles?.avatar_url,
            initials: (p.profiles?.full_name || 'U').charAt(0).toUpperCase(),
            color: 'bg-teal-500' 
          }
        }));
      }

      setPhotos(mappedUploads);
    } catch (error) {
      console.error('Unexpected error in fetchPhotos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (photo: any) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    setDeletingId(photo.id);
    try {
      const urlParts = photo.url.split('/event-images/');
      if (urlParts.length > 1) {
        const storagePath = urlParts[1];
        await supabase.storage.from('event-images').remove([storagePath]);
      }

      const { error } = await supabase.from('event_photos').delete().eq('id', photo.id);
      if (error) throw error;

      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert('Failed to delete photo: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPhotos = photos.filter(p => {
    if (activeTab === 'My Uploads') {
      if (p.userId !== user?.id) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.user.handle.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full bg-[#fafffe] pb-28 min-h-screen relative">
      <div className="animate-gradient-bar h-[3px] w-full sticky top-0 z-50" />

      {/* Full Screen Image Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="flex items-center justify-center size-12 rounded-full bg-white/10 backdrop-blur-xl text-white border border-white/20 hover:bg-white/20 hover:scale-110 transition-all shadow-lg"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {user?.id === selectedPhoto.userId && (
              <button
                onClick={() => {
                  handleDelete(selectedPhoto);
                  setSelectedPhoto(null);
                }}
                className="flex items-center justify-center size-12 rounded-full bg-red-500/80 backdrop-blur-xl text-white hover:bg-red-500 hover:scale-110 transition-all shadow-lg shadow-red-500/30"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center p-4 relative group">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.title}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl shadow-teal-900/50"
            />
          </div>

          <div className="p-8 bg-gradient-to-t from-black via-black/80 to-transparent text-white pb-12 absolute bottom-0 left-0 w-full transform translate-y-2 animate-slide-up">
            <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-cyan-100">{selectedPhoto.title}</h2>
            <div className="flex items-center gap-4 mt-4">
              <div className="relative">
                {selectedPhoto.user.avatar ? (
                  <img src={selectedPhoto.user.avatar} className="size-12 rounded-full border-2 border-white/40 object-cover shadow-lg" alt="Avatar" />
                ) : (
                  <div className={`size-12 rounded-full border-2 border-white/40 flex items-center justify-center text-lg text-white font-bold shadow-lg ${selectedPhoto.user.color || 'bg-teal-500'}`}>{selectedPhoto.user.initials}</div>
                )}
                <div className="absolute bottom-0 right-0 size-3 bg-teal-400 rounded-full border-2 border-black"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold">{selectedPhoto.user.handle}</span>
                <span className="text-sm font-medium text-teal-200/80">Uploaded {new Date(selectedPhoto.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Glassmorphism Header */}
        <header className="sticky top-[3px] z-30 px-3 pt-3 mb-4">
          <div
            className="rounded-2xl p-4 backdrop-blur-xl border border-white/40 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(240,253,250,0.85) 0%, rgba(204,251,241,0.6) 50%, rgba(207,250,254,0.5) 100%)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-extrabold text-[#14312A] tracking-tight">Gallery</h1>
              <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full shadow-sm border border-white/50">
                <span className="material-symbols-outlined text-[18px] text-teal-600">photo_library</span>
                <span className="text-xs font-bold text-teal-800">{filteredPhotos.length}</span>
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
                placeholder="Search photos or users..."
                type="text"
              />
            </div>
          </div>
        </header>

        {/* Filter Tabs */}
        <section className="px-4 sticky top-[130px] z-20 bg-[#fafffe]/90 backdrop-blur-md py-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('Recent')}
              className={`flex h-10 shrink-0 items-center justify-center rounded-full px-6 transition-all duration-300 font-bold text-sm ${activeTab === 'Recent' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30 scale-105' : 'bg-white text-teal-800 border border-teal-100 hover:border-teal-300'}`}
            >
              All Photos
            </button>
            <button
              onClick={() => setActiveTab('My Uploads')}
              className={`flex h-10 shrink-0 items-center justify-center rounded-full px-6 transition-all duration-300 font-bold text-sm ${activeTab === 'My Uploads' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30 scale-105' : 'bg-white text-teal-800 border border-teal-100 hover:border-teal-300'}`}
            >
              My Uploads
            </button>
          </div>
        </section>

        {/* Masonry Grid */}
        <div className="flex-1 px-4 pb-12 mt-6 space-y-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-teal-600 gap-4">
              <div className="size-10 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
              <p className="text-sm font-bold animate-pulse">Loading Gallery...</p>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="size-20 rounded-full bg-teal-50 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-teal-300">image_search</span>
              </div>
              <p className="text-lg font-bold text-[#14312A] mb-1">{searchQuery ? 'No matching photos.' : 'No photos yet.'}</p>
              <p className="text-sm font-medium text-teal-600/60">Upload memories from your events to see them here.</p>
            </div>
          ) : (
            (() => {
              const groups: { [key: string]: typeof photos } = {};
              filteredPhotos.forEach(p => {
                const key = p.title || 'Ungrouped';
                if (!groups[key]) groups[key] = [];
                groups[key].push(p);
              });

              return Object.entries(groups).map(([groupTitle, groupPhotos]) => (
                <div key={groupTitle} className="animate-fade-slide-up">
                  <div className="flex items-center gap-3 mb-4 sticky top-[180px] z-10 bg-[#fafffe]/90 backdrop-blur-md py-2">
                    <div className="h-4 w-1.5 bg-gradient-to-b from-teal-400 to-cyan-400 rounded-full"></div>
                    <h3 className="text-lg font-extrabold text-[#14312A] truncate">{groupTitle}</h3>
                    <span className="text-xs font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-100">{groupPhotos.length}</span>
                  </div>
                  
                  <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                    {groupPhotos.map(photo => (
                      <div key={photo.id} onClick={() => setSelectedPhoto(photo)} className="break-inside-avoid relative group overflow-hidden rounded-2xl bg-teal-50 shadow-sm border border-teal-100/50 hover:shadow-xl hover:shadow-teal-900/10 transition-all duration-500 cursor-pointer">
                        <img src={photo.url} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110" alt={photo.title} loading="lazy" />

                        <div className="absolute inset-0 bg-gradient-to-t from-[#14312A]/90 via-[#14312A]/20 to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute top-3 right-3 flex gap-2 scale-90 group-hover:scale-100 transition-transform">
                            {user?.id === photo.userId && (
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(photo); }} className="bg-red-500/90 hover:bg-red-600 backdrop-blur-md rounded-full p-2 flex items-center justify-center text-white shadow-lg">
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 p-4 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <div className="flex items-center gap-2.5">
                              {photo.user.avatar ? (
                                <img src={photo.user.avatar} className="size-6 rounded-full border border-white/40 object-cover shadow-sm" alt="Avatar" />
                              ) : (
                                <div className={`size-6 rounded-full border border-white/40 flex items-center justify-center text-[10px] text-white font-bold shadow-sm ${photo.user.color || 'bg-teal-500'}`}>{photo.user.initials}</div>
                              )}
                              <span className="text-white/95 text-xs font-bold truncate drop-shadow-md">{photo.user.handle}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryScreen;
