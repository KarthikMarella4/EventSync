import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const GalleryScreen: React.FC = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      setLoading(true);

      // 1. Fetch Event Covers
      const coversPromise = supabase
        .from('events')
        .select(`
          id,
          title,
          image_url,
          created_at,
          creator_id,
          profiles:creator_id (auth_id:id, full_name, avatar_url, username)
        `)
        .not('image_url', 'is', null);

      // 2. Fetch Uploaded Photos
      const uploadsPromise = supabase
        .from('event_photos')
        .select(`
          id,
          photo_url,
          created_at,
          user_id,
          events (title),
          profiles:user_id (full_name, avatar_url, username)
        `);

      const [coversResult, uploadsResult] = await Promise.all([coversPromise, uploadsPromise]);

      // Process Covers
      let mappedCovers: any[] = [];
      if (coversResult.data) {
        mappedCovers = coversResult.data.map((e: any) => ({
          id: e.id,
          url: e.image_url,
          title: e.title,
          type: 'Cover',
          userId: e.creator_id,
          createdAt: new Date(e.created_at).getTime(),
          user: {
            handle: e.profiles?.username || e.profiles?.full_name || 'User',
            avatar: e.profiles?.avatar_url,
            initials: (e.profiles?.full_name || 'U').charAt(0).toUpperCase(),
            color: 'bg-blue-500'
          }
        }));
      }

      // Process Uploads
      let mappedUploads: any[] = [];
      if (uploadsResult.data) {
        mappedUploads = uploadsResult.data.map((p: any) => ({
          id: p.id,
          url: p.photo_url,
          title: p.events?.title || 'Event Photo',
          type: 'Upload',
          userId: p.user_id,
          createdAt: new Date(p.created_at).getTime(),
          user: {
            handle: p.profiles?.username || p.profiles?.full_name || 'User',
            avatar: p.profiles?.avatar_url,
            initials: (p.profiles?.full_name || 'U').charAt(0).toUpperCase(),
            color: 'bg-green-500'
          }
        }));
      }

      // Merge and Sort
      const allPhotos = [...mappedCovers, ...mappedUploads].sort((a, b) => b.createdAt - a.createdAt);
      setPhotos(allPhotos);

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
      if (photo.type === 'Upload') {
        // Extract storage path from URL
        const urlParts = photo.url.split('/event-images/');
        if (urlParts.length > 1) {
          const storagePath = urlParts[1];
          await supabase.storage.from('event-images').remove([storagePath]);
        }

        const { error } = await supabase.from('event_photos').delete().eq('id', photo.id);
        if (error) throw error;
      } else {
        // Cover Image - Just unlink from event
        const { error } = await supabase.from('events').update({ image_url: null }).eq('id', photo.id);
        if (error) throw error;
      }

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
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.user.handle.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full bg-white pb-28 min-h-screen">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <header className="sticky top-0 z-30 flex flex-col gap-2 p-4 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
          <div className="flex items-center justify-between">
            <button className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-text-main">arrow_back_ios_new</span>
            </button>
            <div className="flex flex-col items-center flex-1 mx-2">
              <h2 className="text-text-main text-base font-bold leading-tight tracking-tight text-center line-clamp-1">Event Gallery</h2>
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
            <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-black pl-5 pr-5 shadow-md shadow-black/20 hover:scale-105 transition-transform">
              <p className="text-white text-sm font-bold">All Photos</p>
            </button>
            {['Recent', 'My Uploads'].map(tab => (
              <button key={tab} className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white border border-slate-200 px-4 hover:bg-slate-50 hover:border-slate-300 transition-all">
                <p className="text-slate-700 text-sm font-semibold">{tab}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Masonry Grid with Tailwind Columns */}
        <div className="flex-1 px-4 pb-12 mt-4">
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
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {filteredPhotos.map(photo => (
                <div key={photo.id} className="break-inside-avoid relative group overflow-hidden rounded-2xl bg-slate-100 shadow-sm hover:shadow-md transition-all">
                  <img
                    src={photo.url}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={photo.title}
                    loading="lazy"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 sm:opacity-100">

                    {/* Top Controls */}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Delete Button (Owner Only) */}
                      {user?.id === photo.userId && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleDelete(photo); }}
                          className="bg-red-500/80 hover:bg-red-600 backdrop-blur-md rounded-full p-1.5 flex items-center justify-center text-white transition-colors z-20"
                          disabled={deletingId === photo.id}
                        >
                          {deletingId === photo.id ? (
                            <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          ) : (
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          )}
                        </button>
                      )}
                      <button className="bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full p-1.5 flex items-center justify-center text-white transition-colors">
                        <span className="material-symbols-outlined text-[16px]">favorite_border</span>
                      </button>
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-0 left-0 p-3 w-full">
                      <p className="text-white text-xs font-bold truncate mb-1.5 drop-shadow-md">{photo.title}</p>
                      <div className="flex items-center gap-2">
                        {photo.user.avatar ? (
                          <img src={photo.user.avatar} className="size-5 rounded-full border border-white/40 object-cover" alt="Avatar" />
                        ) : (
                          <div className={`size-5 rounded-full border border-white/40 flex items-center justify-center text-[8px] text-white font-bold ${photo.user.color || 'bg-black'}`}>
                            {photo.user.initials}
                          </div>
                        )}
                        <span className="text-white/90 text-[10px] font-medium truncate drop-shadow-md">{photo.user.handle}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryScreen;
