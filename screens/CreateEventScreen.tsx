import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface CreateEventScreenProps {
  onClose: () => void;
}

const CreateEventScreen: React.FC<CreateEventScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('Party');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null); // This can be base64 from AI or File object
  const [coverFile, setCoverFile] = useState<File | null>(null); // For manual uploads
  const [isPublishing, setIsPublishing] = useState(false);

  // New Fields
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  const categories = ['Party', 'Music', 'Workshop', 'Business', 'Social'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        alert('File size too large. Please select an image under 5MB.');
        return;
      }

      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = () => setCoverImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const publishEvent = async () => {
    if (!title || !description || !date || !time || !location) {
      return alert('Please fill in all fields (Title, Date, Time, Location, Description)');
    }

    setIsPublishing(true);
    try {
      let imageUrl = coverImage;

      // Upload file if it's a manual upload
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(filePath, coverFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('event-images').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      }

      // 10 second timeout
      const insertPromise = supabase.from('events').insert({
        title,
        description,
        category: activeCategory,
        date,
        time,
        location,
        image_url: imageUrl,
        creator_id: user?.id
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out - check your internet connection')), 10000)
      );

      const { error: insertError }: any = await Promise.race([insertPromise, timeoutPromise]);

      if (insertError) throw insertError;

      alert('Event published successfully!');
      onClose();

    } catch (error: any) {
      alert(`Error publishing event: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button onClick={onClose} className="text-base font-medium text-text-muted hover:text-text-main">
          Cancel
        </button>
        <h1 className="text-lg font-bold tracking-tight text-text-main">Create Event</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 no-scrollbar px-5 pt-6 space-y-7">

        {/* Cover Photo Slot */}
        <div className="relative group">
          {coverImage ? (
            <div className="relative w-full h-56 rounded-3xl overflow-hidden shadow-lg">
              <img src={coverImage} className="w-full h-full object-cover" alt="Cover" />
              <button
                onClick={() => { setCoverImage(null); setCoverFile(null); }}
                className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white size-10 rounded-full flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-200 rounded-3xl bg-surface hover:bg-gray-100 transition-all duration-300 overflow-hidden relative">
              <div className="flex gap-4">
                <label className="flex flex-col items-center justify-center p-4 hover:scale-105 transition-transform cursor-pointer">
                  <span className="material-symbols-outlined text-2xl mb-1">add_a_photo</span>
                  <span className="text-[10px] font-bold">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              <p className="text-[10px] text-text-muted mt-2">Recommended: 16:9 ratio</p>
            </div>
          )}
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-text-main ml-1">Event Name</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-14 px-4 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-lg font-semibold text-text-main outline-none transition-all"
            placeholder="e.g., Summer Rooftop Party"
            type="text"
          />
        </div>

        {/* Date & Time Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text-main ml-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-14 px-4 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-base font-semibold text-text-main outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text-main ml-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-14 px-4 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-base font-semibold text-text-main outline-none transition-all"
            />
          </div>
        </div>

        {/* Location Input */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-text-main ml-1">Location</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold material-symbols-outlined text-[20px]">location_on</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-14 pl-11 pr-4 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-base font-semibold text-text-main outline-none transition-all"
              placeholder="e.g. Central Park, NY"
              type="text"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-text-main ml-1">Category</label>
          <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-semibold border transition-all ${activeCategory === cat ? 'bg-black text-white border-transparent shadow-lg' : 'bg-white border-gray-200 text-gray-600'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2 pb-4">
          <div className="flex justify-between items-baseline px-1">
            <label className="block text-sm font-semibold text-text-main">About Event</label>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-4 bg-surface border border-transparent focus:bg-white rounded-2xl text-base text-text-main placeholder-gray-400 min-h-[120px] resize-none outline-none"
            placeholder="What should guests expect?"
          ></textarea>
        </div>
      </main>

      {/* Sticky Publish Button */}
      <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-white via-white to-transparent pt-10">
        <button
          onClick={publishEvent}
          disabled={isPublishing}
          className="w-full h-14 flex items-center justify-center gap-2 bg-black text-white font-bold text-lg rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPublishing ? (
            <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <>
              <span>Publish Event</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateEventScreen;
