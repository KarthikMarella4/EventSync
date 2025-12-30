
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { insertGoogleTask } from '../lib/googleTasks';
import { createCalendarEvent } from '../lib/googleCalendar';

interface CreateTaskModalProps {
    onClose: () => void;
    onTaskCreated?: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose, onTaskCreated }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    // Custom Time State
    const [timeHour, setTimeHour] = useState('12');
    const [timeMinute, setTimeMinute] = useState('00');
    const [timeAmPm, setTimeAmPm] = useState('PM');

    // Sync to 24h format for DB
    React.useEffect(() => {
        let hourInt = parseInt(timeHour, 10);
        if (timeAmPm === 'PM' && hourInt < 12) hourInt += 12;
        if (timeAmPm === 'AM' && hourInt === 12) hourInt = 0;

        const hourStr = hourInt.toString().padStart(2, '0');
        setTime(`${hourStr}:${timeMinute}`);
    }, [timeHour, timeMinute, timeAmPm]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        console.log('Submit clicked');

        if (!user) {
            alert('You must be logged in to create a task.');
            return;
        }

        if (!title || !date || !time) {
            alert('Please fill in Title, Date and Time');
            return;
        }

        setIsSubmitting(true);
        console.log('Starting submission...', { title, date, time });

        try {
            const dueDate = new Date(`${date}T${time}`).toISOString();
            console.log('User ID:', user.id);

            // 1. Insert into Supabase (Initial) - WITH TIMEOUT
            console.log('Inserting into Supabase...');

            const insertPromise = supabase.from('tasks').insert({
                user_id: user?.id,
                title,
                description,
                due_date: dueDate,
                is_completed: false
            }).select().single();

            const dbTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Database Request Timed Out (Check Connection)')), 10000)
            );

            // @ts-ignore
            const { data: taskData, error } = await Promise.race([insertPromise, dbTimeoutPromise]);

            if (error) {
                console.error('Supabase Insert Error:', error);
                throw error;
            }
            console.log('Supabase Insert Success');

            // 2. Sync to Google Tasks (with Timeout)
            try {
                console.log('Fetching session for Google Token...');
                const { data: { session } } = await supabase.auth.getSession();
                const providerToken = session?.provider_token;
                console.log('Provider Token exists:', !!providerToken);

                if (providerToken) {
                    console.log('Creating Google Task...');
                    // Wrap Google Sync in a 8s timeout so UI doesn't freeze
                    const syncPromise = (async () => {
                        const googleTaskId = await insertGoogleTask({
                            title,
                            notes: description,
                            due: dueDate
                        }, providerToken);

                        let googleCalendarEventId = null;
                        try {
                            const startDateTime = new Date(`${date}T${time}`);
                            const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

                            const eventData = await createCalendarEvent({
                                title: `Task: ${title}`,
                                description: description || '',
                                location: '',
                                startTime: startDateTime.toISOString(),
                                endTime: endDateTime.toISOString(),
                            }, providerToken);
                            googleCalendarEventId = eventData.id;
                        } catch (e) { console.error('Cal sync error', e); }

                        return { googleTaskId, googleCalendarEventId };
                    })();

                    const timeoutPromise = new Promise<{ googleTaskId: any, googleCalendarEventId: any }>((_, reject) =>
                        setTimeout(() => reject(new Error('Google Sync Timed Out')), 8000)
                    );

                    const result = await Promise.race([syncPromise, timeoutPromise]);

                    if (result && (result.googleTaskId || result.googleCalendarEventId)) {
                        // Update Supabase with IDs (fire and forget to speed up UI)
                        supabase.from('tasks').update({
                            google_task_id: result.googleTaskId,
                            google_calendar_event_id: result.googleCalendarEventId
                        }).eq('id', taskData.id).then(() => console.log('IDs updated'));

                        alert('Task created & Synced!');
                    }
                } else {
                    // No token, just done
                }
            } catch (calError: any) {
                console.error('Google Tasks sync failed/timed out', calError);
                // We do NOT block the User here. The task is created in Supabase.
                // Just notify them it exists but sync failed.
            }

            if (Notification.permission === 'granted') {
                new Notification('Task Created: ' + title, {
                    body: `Due: ${date} at ${time}`,
                    icon: '/pwa-192x192.png' // fallback icon
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission();
            }

            if (onTaskCreated) onTaskCreated();
            onClose();

        } catch (err: any) {
            console.error('Catch Error:', err);
            alert(err.message);
        } finally {
            console.log('Finally block reached');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden sm:rounded-3xl">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <button onClick={onClose} className="text-text-muted hover:text-black font-medium transition-colors">Cancel</button>
                <h2 className="text-lg font-bold text-black">New Task</h2>
                <div className="w-10"></div> {/* Spacer for center alignment */}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-6">

                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-900 ml-1">Task Title <span className="text-red-500">*</span></label>
                    <input
                        autoFocus
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Buy groceries"
                        className="w-full h-14 px-4 bg-surface rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none text-lg font-semibold transition-all"
                    />
                </div>

                {/* Date/Time Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 ml-1">Due Date <span className="text-red-500">*</span></label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full h-12 px-4 bg-surface rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none font-medium transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 ml-1">Time <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            {/* Hour */}
                            <div className="relative flex-1">
                                <select
                                    value={timeHour}
                                    onChange={(e) => setTimeHour(e.target.value)}
                                    className="w-full h-12 pl-3 pr-8 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-base font-semibold outline-none appearance-none transition-all"
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
                                    className="w-full h-12 pl-3 pr-8 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-base font-semibold outline-none appearance-none transition-all"
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
                                    className="w-full h-12 pl-3 pr-8 bg-surface border border-transparent focus:bg-white focus:border-black/10 rounded-2xl text-base font-semibold outline-none appearance-none transition-all"
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

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-900 ml-1">Notes</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Add details..."
                        className="w-full p-4 bg-surface rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none font-medium transition-all min-h-[120px] resize-none"
                    />
                </div>
            </div>

            {/* Footer Action */}
            <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-white via-white to-transparent pt-10">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-xl shadow-black/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span className="material-symbols-outlined">check</span>
                            Create Task
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
