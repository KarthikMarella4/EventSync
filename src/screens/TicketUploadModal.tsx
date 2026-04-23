
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface TicketUploadModalProps {
    onClose: () => void;
    onUploadComplete: () => void;
}

export const TicketUploadModal: React.FC<TicketUploadModalProps> = ({ onClose, onUploadComplete }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [ticketType, setTicketType] = useState<string>('movie');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !title || !user || !ticketType) {
            alert('Please fill in all fields (File, Title, Type).');
            return;
        }

        setIsUploading(true);

        try {
            // 1. Upload File
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('tickets')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Storage Upload Error:', uploadError);
                throw new Error(`Storage: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('tickets')
                .getPublicUrl(fileName);

            // 2. Insert Record
            const { error: dbError } = await supabase
                .from('tickets')
                .insert({
                    user_id: user.id,
                    title,
                    type: ticketType.toLowerCase(),
                    file_url: publicUrl
                });

            if (dbError) {
                console.error('DB Insert Error:', dbError);
                throw new Error(`Database: ${dbError.message}`);
            }

            alert('Ticket uploaded successfully!');
            onUploadComplete();
            onClose();

        } catch (error: any) {
            console.error('Upload Process failed:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const suggestions = ['movie', 'train', 'flight', 'concert', 'bus'];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

            {/* Modal */}
            <div className="bg-white w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl p-6 pointer-events-auto animate-slide-up sm:animate-scale-in relative">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-black">Upload Ticket</h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Type Selector */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Ticket Type</label>

                        {/* Suggestions */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {suggestions.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setTicketType(type)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors border-2 ${ticketType === type
                                            ? 'border-black bg-black text-white'
                                            : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {/* Manual Input */}
                        <input
                            value={ticketType}
                            onChange={e => setTicketType(e.target.value)}
                            placeholder="Or type custom category..."
                            className="w-full h-10 px-4 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-black/10 outline-none font-medium text-sm"
                        />
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Avengers Endgame"
                            className="w-full h-12 px-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none font-medium"
                        />
                    </div>

                    {/* File Drop/Select */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Attachment</label>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
                            {file ? (
                                <div className="text-center p-4">
                                    <span className="material-symbols-outlined text-green-500 text-3xl mb-1">check_circle</span>
                                    <p className="text-sm font-medium text-black truncate max-w-[200px]">{file.name}</p>
                                </div>
                            ) : (
                                <div className="text-center p-4 text-gray-400">
                                    <span className="material-symbols-outlined text-3xl mb-1">cloud_upload</span>
                                    <p className="text-xs font-medium">Tap to upload Image or PDF</p>
                                </div>
                            )}
                        </label>
                    </div>

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="w-full h-14 mt-4 bg-black text-white rounded-2xl font-bold text-lg shadow-xl shadow-black/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="material-symbols-outlined">upload</span>
                                Save Ticket
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
