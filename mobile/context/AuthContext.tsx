import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '@shared/types';
import { getUser } from '@shared/services/storage';
import { supabase } from '@shared/services/supabase';
import { Session } from '@supabase/supabase-js';

type AuthContextType = {
    user: UserProfile | null;
    session: Session | null;
    isLoading: boolean;
    signIn: (user: UserProfile) => void;
    signOut: () => void;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    signIn: () => { },
    signOut: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                // Load detailed profile
                getUser().then(u => {
                    setUser(u);
                    setIsLoading(false);
                }).catch(() => setIsLoading(false));
            } else {
                setIsLoading(false);
            }
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session && !user) {
                getUser().then(setUser);
            } else if (!session) {
                setUser(null);
            }
        });
    }, []);

    const signIn = (userData: UserProfile) => {
        setUser(userData);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
