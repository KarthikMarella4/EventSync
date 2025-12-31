import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface GalleryUploadModalProps {
    onClose: () => void;
    onUploadComplete: () => void;
}

export const GalleryUploadModal: React.FC<GalleryUploadModalProps> = ({ onClose, onUploadComplete }) => {
    const { user } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loadingEvents, setLoadingEvents] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            fetchEvents();
        }
    }, [user]);

    const fetchEvents = async () => {
        try {
            // Fetch events created by user AND events user is attending (if we had that logic)
            // For now, fetch all events (or just ones created by user?) 
            // The requirement implies adding to ANY event usually, but strict RLS might block it.
            // Let's fetch all events the user can "see" which is usually all public events.
            const { data, error } = await supabase
                .from('events')
                .select('id, title, date')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                setEvents(data);
                if (data.length > 0) setSelectedEventId(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreviewUrl(URL.createObjectURL(f));
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedEventId) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `gallery/${selectedEventId}/${Math.random()}.${fileExt}`;

            // 1. Upload
            const { error: uploadError } = await supabase.storage
                .from('event-images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('event-images')
                .getPublicUrl(fileName);

            // 2. Insert DB Record
            const { error: dbError } = await supabase
                .from('event_photos')
                .insert({
                    event_id: selectedEventId,
                    user_id: user?.id,
                    photo_url: publicUrl
                });

            if (dbError) throw dbError;

            alert('Photo uploaded successfully!');
            onUploadComplete();
            onClose();

        } catch (error: any) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-black">Upload Photo</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-5">

                    {/* Event Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Event</label>
                        {loadingEvents ? (
                            <div className="h-12 bg-gray-50 rounded-xl animate-pulse"></div>
                        ) : events.length === 0 ? (
                            <p className="text-sm text-red-500">No events found. Create an event first.</p>
                        ) : (
                            <div className="relative">
                                <select
                                    value={selectedEventId}
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                    className="w-full h-12 pl-4 pr-10 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-black/5 appearance-none text-sm font-bold"
                                >
                                    {events.map(e => (
                                        <option key={e.id} value={e.id}>{e.title}</option>
                                    ))}
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                    <span className="material-symbols-outlined">expand_more</span>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Image Preview / Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Photo</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group
                                ${previewUrl ? 'border-transparent' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                            `}
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white font-bold text-sm">Change Photo</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <div className="size-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
                                        <span className="material-symbols-outlined">add_photo_alternate</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-500">Tap to select photo</p>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleUpload}
                        disabled={uploading || !file || !selectedEventId}
                        className="w-full py-3.5 bg-black text-white font-bold rounded-xl shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">cloud_upload</span>
                                <span>Upload to Gallery</span>
                            </>
                        )}
                    </button>

                </div>

            </div>
        </div>
    );
};
