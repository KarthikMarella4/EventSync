import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && isOpen) {
            fetchNotifications();
            // Mark all as read when opened (simplified logic for now)
            markAllRead();
        }
    }, [user, isOpen]);

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (data) {
                const mapped: Notification[] = data.map((n: any) => ({
                    id: n.id,
                    userId: n.user_id,
                    type: n.type,
                    message: n.message,
                    isRead: n.is_read,
                    relatedId: n.related_id,
                    createdAt: n.created_at
                }));
                setNotifications(mapped);
            } else {
                // Mock
                setNotifications([
                    { id: '1', userId: 'u1', type: 'reminder', message: 'Event "Summer Party" starts in 1 hour', isRead: false, createdAt: new Date().toISOString() },
                    { id: '2', userId: 'u1', type: 'invite', message: 'Jane invited you to "Tech Meetup"', isRead: true, createdAt: new Date().toISOString() }
                ]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        // In real app, update DB
        // await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose}></div>

            {/* Dropdown */}
            <div className="absolute top-16 right-5 z-50 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-5 duration-200 origin-top-right">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-bold text-black">Notifications</h3>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-700">Mark all read</button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-3xl opacity-50">notifications_off</span>
                            No new notifications
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {notifications.map(n => (
                                <div key={n.id} className={`p-4 hover:bg-gray-50 transition-colors flex gap-3 ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                                    <div className={`mt-1 size-2 rounded-full shrink-0 ${!n.isRead ? 'bg-red-500' : 'bg-transparent'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`material-symbols-outlined text-[18px] ${n.type === 'reminder' ? 'text-orange-500' :
                                                n.type === 'invite' ? 'text-purple-500' : 'text-blue-500'
                                                }`}>
                                                {n.type === 'reminder' ? 'alarm' : n.type === 'invite' ? 'mail' : 'info'}
                                            </span>
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{n.type}</span>
                                            <span className="text-[10px] text-gray-400 ml-auto">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
