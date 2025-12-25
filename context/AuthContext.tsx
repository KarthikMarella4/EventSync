
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
                mapSupabaseUserToDomainUser(session.user).then(setUser);
            } else {
                setUser(null);
            }
        }).catch((err) => {
            console.error('Session check failed', err);
            setUser(null);
        }).finally(() => {
            clearTimeout(timeoutId);
            setIsLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const domainUser = await mapSupabaseUserToDomainUser(session.user);
                setUser(domainUser);
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const mapSupabaseUserToDomainUser = async (sbUser: SupabaseUser): Promise<User> => {
        // Try to fetch profile from 'profiles' table
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, occupation')
            .eq('id', sbUser.id)
            .single();

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
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) console.error('Error signing in with Google:', error.message);
    }

    const logout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, signInWithPassword, signUp, logout, isLoading, signInWithGoogle }}>
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
