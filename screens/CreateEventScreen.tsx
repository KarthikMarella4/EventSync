import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { createCalendarEvent } from '../lib/googleCalendar';

interface CreateEventScreenProps {
  onClose: () => void;
  onEventCreated?: (date: string) => void;
  initialEvent?: any; // Using any to match the loose Supabase types for now, or define Event type
}

const CreateEventScreen: React.FC<CreateEventScreenProps> = ({ onClose, onEventCreated, initialEvent }) => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('Party');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // New Fields
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  // Custom Time State
  const [timeHour, setTimeHour] = useState('12');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timeAmPm, setTimeAmPm] = useState('PM');

  // Pre-fill on load if Editing
  React.useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setDescription(initialEvent.description || '');
      setActiveCategory(initialEvent.category || 'Party');
      setDate(initialEvent.date || '');
      setLocation(initialEvent.location || '');
      setCoverImage(initialEvent.imageUrl || initialEvent.image_url || null);

      if (initialEvent.time) {
        const [h, m] = initialEvent.time.split(':');
        let hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;

        setTimeHour(hour12.toString());
        setTimeMinute(m || '00');
        setTimeAmPm(ampm);
        setTime(initialEvent.time);
      }
    }
  }, [initialEvent]);

  // Sync to 24h format for DB
  React.useEffect(() => {
    let hourInt = parseInt(timeHour, 10);
    if (timeAmPm === 'PM' && hourInt < 12) hourInt += 12;
    if (timeAmPm === 'AM' && hourInt === 12) hourInt = 0;

    const hourStr = hourInt.toString().padStart(2, '0');
    setTime(`${hourStr}:${timeMinute}`);
  }, [timeHour, timeMinute, timeAmPm]);

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

      const eventData = {
        title,
        description,
        category: activeCategory,
        date,
        time,
        location,
        image_url: imageUrl,
        creator_id: user?.id
      };

      if (initialEvent) {
        // UPDATE EXISTING EVENT
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', initialEvent.id);

        if (updateError) throw updateError;
        alert('Event updated successfully!');

        // Optional: Update Google Calendar here if needed

      } else {
        // CREATE NEW EVENT
        const insertPromise = supabase.from('events').insert(eventData).select().single();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out - check your internet connection')), 10000)
        );

        const { data: newSupabaseEvent, error: insertError }: any = await Promise.race([insertPromise, timeoutPromise]);
        if (insertError) throw insertError;

        // Add to Google Calendar
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const providerToken = session?.provider_token;

          if (providerToken) {
            const startDateTime = new Date(`${date}T${time}`);
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

            const googleEventId = await createCalendarEvent({
              title,
              description,
              location,
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
            }, providerToken);

            if (googleEventId) {
              await supabase.from('events').update({ google_calendar_event_id: googleEventId }).eq('id', newSupabaseEvent.id);
            }
            alert('Event published and added to your Google Calendar!');
          } else {
            alert('Event published! (Calendar sync skipped: No Google permission)');
          }
        } catch (calendarError) {
          console.error("Calendar Sync Error", calendarError);
          alert('Event published, but failed to add to Google Calendar.');
        }
      }

      if (onEventCreated) onEventCreated(date);
      onClose();

    } catch (error: any) {
      alert(`Error saving event: ${error.message}`);
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
            <div className="flex gap-2">
              {/* Hour */}
              <div className="relative flex-1">
                <select
                  value={timeHour}
                  onChange={(e) => setTimeHour(e.target.value)}
                  className="w-full h-14 pl-3 pr-8 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-base font-semibold text-text-main outline-none appearance-none transition-all"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <option key={h} value={h.toString()}>{h}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="material-symbols-outlined text-sm text-text-muted">expand_more</span>
                </div>
              </div>

              {/* Minute */}
              <div className="relative flex-1">
                <select
                  value={timeMinute}
                  onChange={(e) => setTimeMinute(e.target.value)}
                  className="w-full h-14 pl-3 pr-8 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-base font-semibold text-text-main outline-none appearance-none transition-all"
                >
                  {['00', '15', '30', '45'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="material-symbols-outlined text-sm text-text-muted">expand_more</span>
                </div>
              </div>

              {/* AM/PM */}
              <div className="relative flex-1">
                <select
                  value={timeAmPm}
                  onChange={(e) => setTimeAmPm(e.target.value)}
                  className="w-full h-14 pl-3 pr-8 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-base font-semibold text-text-main outline-none appearance-none transition-all"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="material-symbols-outlined text-sm text-text-muted">expand_more</span>
                </div>
              </div>
            </div>
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

          {/* Manual Input */}
          <input
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full h-12 px-4 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-base font-medium text-text-main outline-none transition-all placeholder-gray-400"
            placeholder="Type your own or select below"
            type="text"
          />

          {/* Suggestions */}
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
