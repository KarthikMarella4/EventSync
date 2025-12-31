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

    // Realtime Subscription for new uploads
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

      // Only Fetch Uploaded Photos (User requested to remove event covers)
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

      console.log('Gallery: Fetched Data:', data);
      console.log('Gallery: Fetch Error:', error);

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
            color: 'bg-green-500' // could randomize
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
      // Extract storage path from URL
      const urlParts = photo.url.split('/event-images/');
      if (urlParts.length > 1) {
        const storagePath = urlParts[1];
        await supabase.storage.from('event-images').remove([storagePath]);
      }

      const { error } = await supabase.from('event_photos').delete().eq('id', photo.id);
      if (error) throw error;

      // Optimistic update
      setPhotos(prev => prev.filter(p => p.id !== photo.id));

    } catch (error: any) {
      console.error('Delete failed:', error);
      alert('Failed to delete photo: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter Logic
  const filteredPhotos = photos.filter(p => {
    // 1. Tab Filter
    if (activeTab === 'My Uploads') {
      if (p.userId !== user?.id) return false;
    }

    // 2. Search Filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.user.handle.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full bg-white pb-28 min-h-screen">
      {/* Full Screen Image Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
          {/* Header / Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="flex items-center justify-center size-10 rounded-full bg-black/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 transition-all"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>

            {user?.id === selectedPhoto.userId && (
              <button
                onClick={() => {
                  handleDelete(selectedPhoto);
                  setSelectedPhoto(null);
                }}
                className="flex items-center justify-center size-10 rounded-full bg-red-500/80 backdrop-blur-md text-white hover:bg-red-600 transition-all"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
          </div>

          {/* Main Image */}
          <div className="flex-1 flex items-center justify-center p-2 relative">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.title}
              className="max-w-full max-h-[90vh] object-contain shadow-2xl"
            />
          </div>

          {/* Footer Info */}
          <div className="p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white pb-10">
            <h2 className="text-xl font-bold mb-1">{selectedPhoto.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              {selectedPhoto.user.avatar ? (
                <img src={selectedPhoto.user.avatar} className="size-8 rounded-full border border-white/40 object-cover" alt="Avatar" />
              ) : (
                <div className={`size-8 rounded-full border border-white/40 flex items-center justify-center text-xs text-white font-bold ${selectedPhoto.user.color || 'bg-black'}`}>{selectedPhoto.user.initials}</div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{selectedPhoto.user.handle}</span>
                <span className="text-xs text-white/60">Uploaded {new Date(selectedPhoto.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <header className="sticky top-0 z-30 flex flex-col gap-2 p-4 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
          <div className="flex items-center justify-between">
            <button className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-text-main">arrow_back_ios_new</span>
            </button>
            <div className="flex flex-col items-center flex-1 mx-2">
              <div className="flex items-center gap-1">
                <h2 className="text-text-main text-base font-bold leading-tight tracking-tight text-center line-clamp-1">Event Gallery</h2>
                <button onClick={fetchPhotos} className="p-1 hover:bg-gray-100 rounded-full" title="Refresh">
                  <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                </button>
              </div>
              <p className="text-xs text-text-muted font-medium">{filteredPhotos.length} Photos</p>
            </div>
            <button className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-text-main">ios_share</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative group mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-black transition-colors">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-slate-100 border border-transparent rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black/10 text-sm font-medium transition-all placeholder:text-slate-400"
              placeholder="Search photos or users..."
              type="text"
            />
          </div>
        </header>

        {/* Stats */}
        <section className="flex gap-3 px-4 py-4 w-full">
          <div className="flex flex-1 flex-col gap-1 rounded-xl bg-white p-3 border border-slate-200 items-center text-center shadow-sm hover:border-slate-300 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">photo_library</span>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Total</p>
            </div>
            <p className="text-text-main text-2xl font-bold leading-tight">{photos.length}</p>
          </div>
          <div className="flex flex-1 flex-col gap-1 rounded-xl bg-white p-3 border border-slate-200 items-center text-center shadow-sm hover:border-slate-300 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-xl">cloud_upload</span>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Uploads</p>
            </div>
            <p className="text-text-main text-2xl font-bold leading-tight">{photos.filter(p => p.type === 'Upload').length}</p>
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="w-full overflow-x-auto no-scrollbar pb-2 px-4 sticky top-[120px] z-20 bg-white pt-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('Recent')}
              className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-all ${activeTab === 'Recent' ? 'bg-black text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              <p className="text-sm font-bold">All Photos</p>
            </button>
            <button
              onClick={() => setActiveTab('My Uploads')}
              className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-all ${activeTab === 'My Uploads' ? 'bg-black text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              <p className="text-sm font-bold">My Uploads</p>
            </button>
          </div>
        </section>

        {/* Masonry Grid with Tailwind Columns */}
        <div className="flex-1 px-4 pb-12 mt-4 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <span className="material-symbols-outlined text-4xl animate-pulse">image</span>
              <p className="text-sm font-medium">Loading Gallery...</p>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <span className="material-symbols-outlined text-4xl">search_off</span>
              <p className="text-sm font-medium">{searchQuery ? 'No photos found matching your search.' : 'No photos yet. Create an event!'}</p>
            </div>
          ) : (
            // Grouping Logic Implementation inside the render
            (() => {
              // Group the filtered photos
              const groups: { [key: string]: typeof photos } = {};
              filteredPhotos.forEach(p => {
                const key = p.title || 'Ungrouped';
                if (!groups[key]) groups[key] = [];
                groups[key].push(p);
              });

              return Object.entries(groups).map(([groupTitle, groupPhotos]) => (
                <div key={groupTitle}>
                  <h3 className="text-xl font-bold text-black mb-3 ml-1 sticky top-[160px] z-10 bg-white/50 backdrop-blur-sm py-1 max-w-fit px-3 rounded-xl">{groupTitle}</h3>
                  <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                    {groupPhotos.map(photo => (
                      <div key={photo.id} onClick={() => setSelectedPhoto(photo)} className="break-inside-avoid relative group overflow-hidden rounded-2xl bg-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
                        <img src={photo.url} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" alt={photo.title} loading="lazy" />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute top-2 right-2 flex gap-2">
                            {user?.id === photo.userId && (
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(photo); }} className="bg-red-500/80 hover:bg-red-600 backdrop-blur-md rounded-full p-1.5 flex items-center justify-center text-white transition-colors">
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 p-3 w-full">
                            <div className="flex items-center gap-2">
                              {photo.user.avatar ? (
                                <img src={photo.user.avatar} className="size-5 rounded-full border border-white/40 object-cover" alt="Avatar" />
                              ) : (
                                <div className={`size-5 rounded-full border border-white/40 flex items-center justify-center text-[8px] text-white font-bold ${photo.user.color || 'bg-black'}`}>{photo.user.initials}</div>
                              )}
                              <span className="text-white/90 text-[10px] font-medium truncate drop-shadow-md">{photo.user.handle}</span>
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
