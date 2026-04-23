import React, { useState, useRef, useEffect } from 'react';
import { updateCalendarEvent } from '../lib/googleCalendar';
import { supabase } from '../lib/supabase';

interface ReminderButtonProps {
    eventId: string;
    googleEventId?: string;
    className?: string;
    defaultTime?: number;
}

export const ReminderButton: React.FC<ReminderButtonProps> = ({ eventId, googleEventId, className, defaultTime = 30 }) => {
    const [active, setActive] = useState(false);
    const [minutes, setMinutes] = useState(defaultTime);
    const [showMenu, setShowMenu] = useState(false);
    const [customVal, setCustomVal] = useState('10');

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Load state from local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem(`reminder_${eventId}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setActive(parsed.active);
                setMinutes(parsed.minutes || defaultTime);
            } catch (e) {
                console.error("Error parsing reminder state", e);
            }
        }
    }, [eventId, defaultTime]);

    // Click outside listener for menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const saveState = (newActive: boolean, newMinutes: number) => {
        setActive(newActive);
        setMinutes(newMinutes);
        localStorage.setItem(`reminder_${eventId}`, JSON.stringify({ active: newActive, minutes: newMinutes }));

        // Sync with Google Calendar asynchronously
        syncToGoogle(newActive, newMinutes);
    };

    const syncToGoogle = async (isActive: boolean, min: number) => {
        if (!googleEventId) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.provider_token;
            if (!token) return; // Not auth/linked with Google

            const reminders = isActive ? {
                useDefault: false,
                overrides: [{ method: 'popup', minutes: min }]
            } : {
                useDefault: false,
                overrides: []
            };

            await updateCalendarEvent(googleEventId, { reminders }, token);
        } catch (e) {
            console.warn("Failed to sync reminder to Google Calendar (likely not owner or permissions issue)", e);
        }
    };

    const handlePressStart = () => {
        isLongPress.current = false;
        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            setShowMenu(true);
        }, 500); // 500ms long press
    };

    const handlePressEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent parent clicks (like navigation)

        if (isLongPress.current) return;

        // Toggle
        saveState(!active, minutes);
    };

    const handleOptionSelect = (min: number) => {
        saveState(true, min);
        setShowMenu(false);
    };

    const options = [
        { label: '10 mins before', val: 10 },
        { label: '30 mins before', val: 30 },
        { label: '1 hour before', val: 60 },
        { label: '1 day before', val: 1440 },
    ];

    return (
        <div className={`relative z-30 ${className}`}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
        >
            <button
                onClick={handleClick}
                className={`size-8 flex items-center justify-center rounded-full backdrop-blur-md border transition-all duration-300 shadow-sm
          ${active
                        ? 'bg-yellow-400 border-yellow-200 text-black shadow-yellow-100'
                        : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
                    }`}
                title={active ? `Reminder set for ${minutes}m before` : "Set reminder"}
            >
                <span className={`material-symbols-outlined text-[18px] transition-transform ${active ? 'scale-110' : ''}`}>
                    {active ? 'notifications_active' : 'notifications'}
                </span>
            </button>

            {/* Reminder Status Indicator - small dot if active (optional, but requested visual: bell filled vs outline is handled by icon change) */}

            {/* Options Menu */}
            {showMenu && (
                <div
                    ref={menuRef}
                    className="absolute right-0 top-10 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-xs font-bold text-gray-400 px-2 py-1 uppercase tracking-wider mb-1">Set Reminder</div>

                    {options.map((opt) => (
                        <button
                            key={opt.val}
                            onClick={() => handleOptionSelect(opt.val)}
                            className={`text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between
                ${minutes === opt.val && active ? 'bg-yellow-50 text-yellow-700' : 'text-gray-700 hover:bg-gray-100'}
              `}
                        >
                            <span>{opt.label}</span>
                            {minutes === opt.val && active && <span className="material-symbols-outlined text-[16px]">check</span>}
                        </button>
                    ))}

                    <div className="h-px bg-gray-100 my-1 full-width"></div>

                    {/* Custom Input */}
                    <div className="px-3 py-1">
                        <label className="text-xs font-bold text-gray-500 block mb-1">Custom (mins)</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                                value={customVal}
                                onChange={(e) => setCustomVal(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleOptionSelect(parseInt(customVal) || 10);
                                    }
                                }}
                            />
                            <button
                                onClick={() => handleOptionSelect(parseInt(customVal) || 10)}
                                className="bg-black text-white rounded-lg px-2 py-1 text-xs font-bold hover:bg-gray-800"
                            >
                                Set
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
