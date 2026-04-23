
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TicketUploadModal } from './TicketUploadModal';

interface TicketsListModalProps {
    onClose: () => void;
}

export const TicketsListModal: React.FC<TicketsListModalProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);

    const [previewFile, setPreviewFile] = useState<{ url: string; type: string; title: string } | null>(null);

    useEffect(() => {
        if (user) fetchTickets();
    }, [user]);

    const fetchTickets = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });

        if (data) setTickets(data);
        setIsLoading(false);
    };

    const handleDelete = async (ticket: any) => {
        if (!confirm('Are you sure you want to delete this ticket?')) return;

        try {
            // 1. Delete File from Storage
            if (ticket.file_url) {
                const path = ticket.file_url.split('/storage/v1/object/public/tickets/')[1];
                if (path) {
                    const { error: storageError } = await supabase.storage.from('tickets').remove([path]);
                    if (storageError) console.error('Storage Delete Error:', storageError);
                }
            }

            // 2. Delete Record from DB
            const { error: dbError } = await supabase.from('tickets').delete().eq('id', ticket.id);
            if (dbError) throw dbError;

            // 3. Update UI
            setTickets(prev => prev.filter(t => t.id !== ticket.id));

        } catch (error: any) {
            console.error('Delete failed:', error);
            alert('Failed to delete ticket: ' + error.message);
        }
    };

    const handlePreview = (ticket: any) => {
        // Determine type based on extension if not explicit, but we have ticket.type
        // ticket.file_url is the public URL
        const isPdf = ticket.file_url.toLowerCase().endsWith('.pdf');
        setPreviewFile({
            url: ticket.file_url,
            type: isPdf ? 'pdf' : 'image',
            title: ticket.title
        });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'movie': return 'movie';
            case 'train': return 'train';
            case 'flight': return 'flight';
            default: return 'confirmation_number';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'movie': return 'text-red-500 bg-red-50';
            case 'train': return 'text-orange-500 bg-orange-50';
            case 'flight': return 'text-blue-500 bg-blue-50';
            default: return 'text-purple-500 bg-purple-50';
        }
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="bg-white w-full max-w-md h-[80vh] rounded-3xl overflow-hidden flex flex-col relative z-50 animate-scale-in shadow-2xl">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                    <h2 className="text-xl font-bold text-black">My Tickets</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowUpload(true)} className="p-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-1 px-3">
                            <span className="material-symbols-outlined text-sm">add</span>
                            <span className="text-xs font-bold">New</span>
                        </button>
                        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center py-10"><div className="animate-spin size-6 border-2 border-black/20 border-t-black rounded-full" /></div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">sticky_note_2</span>
                            <p className="text-sm">No tickets found.</p>
                        </div>
                    ) : (
                        tickets.map(ticket => {
                            const isPdf = ticket.file_url.toLowerCase().endsWith('.pdf');
                            const typeColor = getColor(ticket.type).split(' ')[0].replace('text-', 'bg-'); // Extract bg color from text class logic roughly or just hardcode

                            return (
                                <div
                                    key={ticket.id}
                                    onClick={() => handlePreview(ticket)}
                                    className="relative w-full aspect-[2/1] rounded-3xl overflow-hidden group cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
                                >
                                    {/* Background */}
                                    {isPdf ? (
                                        <div className={`absolute inset-0 bg-gray-100 flex items-center justify-center`}>
                                            <div className="flex flex-col items-center opacity-20">
                                                <span className="material-symbols-outlined text-6xl text-black">picture_as_pdf</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 group-active:scale-110"
                                            style={{ backgroundImage: `url("${ticket.file_url}")` }}
                                        />
                                    )}

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                                    {/* Type Badge (Top Right) */}
                                    <div className="absolute top-3 right-3 px-3 py-1 bg-white/20 backdrop-blur-md border border-white/20 rounded-full">
                                        <p className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">{getIcon(ticket.type)}</span>
                                            {ticket.type}
                                        </p>
                                    </div>

                                    {/* Delete Button (Top Left - consistent with events) */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(ticket); }}
                                        className="absolute top-3 left-3 size-8 bg-red-500/80 hover:bg-red-600 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                        title="Delete"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>

                                    {/* Content (Bottom) */}
                                    <div className="absolute bottom-0 left-0 w-full p-5">
                                        <h4 className="text-white text-xl font-bold leading-tight truncate">{ticket.title}</h4>
                                        <p className="text-white/60 text-xs font-medium mt-1">Tap to preview</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Upload Modal (Nested) */}
                {showUpload && (
                    <TicketUploadModal
                        onClose={() => setShowUpload(false)}
                        onUploadComplete={fetchTickets}
                    />
                )}
            </div>

            {/* Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setPreviewFile(null)} />
                    <div className="relative w-full max-w-4xl h-[80vh] bg-white rounded-2xl overflow-hidden flex flex-col animate-scale-in">
                        <div className="p-4 bg-black text-white flex justify-between items-center shrink-0">
                            <h3 className="font-bold truncate pr-4">{previewFile.title}</h3>
                            <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                            {previewFile.type === 'pdf' ? (
                                <iframe src={previewFile.url} className="w-full h-full border-none" />
                            ) : (
                                <img src={previewFile.url} alt="Preview" className="max-w-full max-h-full object-contain" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
