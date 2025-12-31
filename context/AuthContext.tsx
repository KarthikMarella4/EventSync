
import React, { createContext, useState, useEffect, useContext } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    signInWithPassword: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
    signInWithGoogle: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const userRef = React.useRef<User | null>(null);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        let mounted = true;

        // Safety timeout to prevent infinite loading (Increased to 8s)
        const timeoutId = setTimeout(() => {
            if (mounted) {
                console.warn('Auth session check timed out, forcing app load.');
                setIsLoading(false);
            }
        }, 8000);

        async function initSession() {
            try {
                console.log('AuthContext: Initializing session...');
                // 1. Get initial session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('AuthContext: Error getting session', error);
                    throw error;
                }

                if (mounted) {
                    if (session?.user) {
                        console.log('AuthContext: Found existing session for', session.user.email);
                        const domainUser = await mapSupabaseUserToDomainUser(session.user);
                        if (mounted) setUser(domainUser);
                    } else {
                        console.log('AuthContext: No session found.');
                        if (mounted) setUser(null);
                    }
                }
            } catch (err) {
                console.error('Session initialization failed:', err);
                if (mounted) setUser(null);
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        initSession();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`AuthContext: Auth State Change: ${event}`, session?.user?.email);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                if (session?.user) {
                    const domainUser = await mapSupabaseUserToDomainUser(session.user);
                    if (mounted) {
                        setUser(domainUser);
                        setIsLoading(false);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    setIsLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const mapSupabaseUserToDomainUser = async (sbUser: SupabaseUser): Promise<User> => {
        // Try to fetch profile from 'profiles' table with a timeout
        let data: any = null;
        try {
            // Create a promise for the DB fetch
            const fetchPromise = supabase
                .from('profiles')
                .select('full_name, avatar_url, occupation')
                .eq('id', sbUser.id)
                .single();

            // Create a timeout promise (2 seconds)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
            );

            // Race them
            const { data: profileData, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (error) throw error;
            data = profileData;
        } catch (e: any) {
            console.warn('Profile fetch failed/timed out, using metadata defaults:', e.message || e);
        }

        // Use cache (userRef) if data fetch failed but we have existing data for same user
        const existingUser = userRef.current;
        const shouldUseCache = existingUser && existingUser.id === sbUser.id;

        // Fallback hierarchy: 1. DB Data, 2. Cache (to prevent flicker/loss), 3. Auth Metadata, 4. Defaults
        const name = data?.full_name || (shouldUseCache ? existingUser.name : null) || sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User';
        const avatar = data?.avatar_url || (shouldUseCache ? existingUser.avatar : null) || sbUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        const occupation = data?.occupation || (shouldUseCache ? existingUser.occupation : null) || 'Member';

        return {
            id: sbUser.id,
            name,
            email: sbUser.email || '',
            isAuthenticated: true,
            avatar,
            occupation
        };
    };

    const signUp = async (email: string, password: string, name: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                },
            },
        });
        if (error) throw error;



        // Manually insert into profiles to ensure data consistency
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: data.user.id,
                        full_name: name,
                        username: email.split('@')[0],
                        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                        updated_at: new Date().toISOString(),
                    }
                ]);

            if (profileError) {
                console.error('Error creating profile:', profileError);
                // Don't throw here, as auth user was created. Just log it.
            }
        }
    };

    const signInWithPassword = async (email: string, password: string) => {
        const signInPromise = supabase.auth.signInWithPassword({
            email,
            password,
        });

        const timeoutPromise = new Promise<{ error: any }>((resolve) =>
            setTimeout(() => resolve({ error: { message: 'Login timed out. Please check your connection.' } }), 8000)
        );

        const { error } = await Promise.race([signInPromise, timeoutPromise]) as any;

        if (error) throw error;
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks',
                redirectTo: window.location.origin
            }
        });
        if (error) console.error('Error signing in with Google:', error.message);
    }

    const logout = async () => {
        setUser(null); // Force local state clear immediately
        setIsLoading(false);
        await supabase.auth.signOut();
    };

    const refreshProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const domainUser = await mapSupabaseUserToDomainUser(session.user);
            setUser(domainUser);
        }
    };

    return (
        <AuthContext.Provider value={{ user, signInWithPassword, signUp, logout, isLoading, signInWithGoogle, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
