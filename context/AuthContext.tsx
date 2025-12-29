
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

    useEffect(() => {
        // Check active session
        // Safety timeout in case Supabase hangs
        const timeoutId = setTimeout(() => {
            setIsLoading(false);
        }, 5000);

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                mapSupabaseUserToDomainUser(session.user)
                    .then(setUser)
                    .catch(err => {
                        console.error('User mapping failed', err);
                        setUser({ id: session.user.id, name: 'User', email: session.user.email || '', isAuthenticated: true });
                    })
                    .finally(() => setIsLoading(false));
            } else {
                setUser(null);
                setIsLoading(false);
            }
        }).catch((err) => {
            console.error('Session check failed', err);
            setUser(null);
            setIsLoading(false);
        }).finally(() => {
            clearTimeout(timeoutId);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                if (session?.user) {
                    const domainUser = await mapSupabaseUserToDomainUser(session.user);
                    setUser(domainUser);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('Auth state change error:', error);
                if (session?.user) setUser({ id: session.user.id, name: 'User', email: session.user.email || '', isAuthenticated: true });
                else setUser(null);
            } finally {
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const mapSupabaseUserToDomainUser = async (sbUser: SupabaseUser): Promise<User> => {
        // Try to fetch profile from 'profiles' table with a timeout
        let data: any = null;
        try {
            const fetchProfile = supabase
                .from('profiles')
                .select('full_name, avatar_url, occupation')
                .eq('id', sbUser.id)
                .single();

            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));

            const result: any = await Promise.race([fetchProfile, timeout]);
            data = result.data;
        } catch (e) {
            console.warn('Profile fetch timed out or failed, using metadata defaults', e);
        }

        // Fallback to metadata or defaults if no profile row yet
        const name = data?.full_name || sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User';
        const avatar = data?.avatar_url || sbUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        const occupation = data?.occupation || 'Member';

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
                scopes: 'https://www.googleapis.com/auth/calendar'
            }
        });
        if (error) console.error('Error signing in with Google:', error.message);
    }

    const logout = async () => {
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
