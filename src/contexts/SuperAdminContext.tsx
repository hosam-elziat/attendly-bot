import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SaasTeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'manager' | 'support' | 'viewer';
  permissions: {
    view_companies: boolean;
    manage_companies: boolean;
    view_employees: boolean;
    manage_subscriptions: boolean;
  };
  is_active: boolean;
  created_at: string;
}

interface SuperAdminContextType {
  user: User | null;
  session: Session | null;
  teamMember: SaasTeamMember | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [teamMember, setTeamMember] = useState<SaasTeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTeamMember = async (userId: string) => {
    const { data, error } = await supabase
      .from('saas_team')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching team member:', error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      role: data.role as SaasTeamMember['role'],
      permissions: data.permissions as SaasTeamMember['permissions'],
    };
  };

  useEffect(() => {
    const hydrateFromSession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setTeamMember(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setTimeout(() => {
        fetchTeamMember(nextSession.user.id)
          .then((member) => {
            setTeamMember(member);
          })
          .catch((error) => {
            console.error('Error fetching team member:', error);
            setTeamMember(null);
          })
          .finally(() => setLoading(false));
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, nextSession) => {
      hydrateFromSession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      hydrateFromSession(existingSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Signin error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setTeamMember(null);
  };

  const isSuperAdmin = teamMember?.role === 'super_admin';

  return (
    <SuperAdminContext.Provider
      value={{
        user,
        session,
        teamMember,
        loading,
        isSuperAdmin,
        signIn,
        signOut,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
