import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  company_id: string | null;
  full_name: string;
  email: string;
  language: string;
  theme: string;
}

interface UserRole {
  role: 'owner' | 'admin' | 'manager' | 'employee';
  company_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, companyName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getUserFullName = (user: User) => {
  const metaName = (user.user_metadata as any)?.full_name;
  if (typeof metaName === 'string' && metaName.trim().length > 0) return metaName.trim();
  return user.email?.split('@')[0] || 'User';
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (authUser: User) => {
    const userId = authUser.id;

    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_roles').select('role, company_id').eq('user_id', userId).maybeSingle(),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (roleRes.error) throw roleRes.error;

    let profileRow = (profileRes.data as UserProfile | null) ?? null;
    const roleRow = (roleRes.data as UserRole | null) ?? null;

    let companyId: string | null = profileRow?.company_id ?? (roleRow?.company_id ?? null);

    // If user is authenticated but has no workspace data yet, bootstrap a company/profile/role.
    if (!companyId && !profileRow && !roleRow) {
      const newCompanyId = crypto.randomUUID();
      const defaultCompanyName = `${getUserFullName(authUser)} Company`;

      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          id: newCompanyId,
          name: defaultCompanyName,
          owner_id: userId,
          country_code: 'EG',
          timezone: 'Africa/Cairo',
          default_currency: 'EGP',
        });

      if (companyError) throw companyError;

      const { data: createdProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          company_id: newCompanyId,
          full_name: getUserFullName(authUser),
          email: authUser.email ?? '',
        })
        .select('*')
        .single();

      if (profileError) throw profileError;

      const { data: createdRole, error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          company_id: newCompanyId,
          role: 'owner',
        })
        .select('role, company_id')
        .single();

      if (roleError) throw roleError;

      const { error: subError } = await supabase.from('subscriptions').insert({
        company_id: newCompanyId,
        status: 'trial',
        plan_name: 'trial',
      });

      if (subError) throw subError;

      profileRow = createdProfile as UserProfile;
      companyId = newCompanyId;
      setUserRole(createdRole as UserRole);
      setProfile(profileRow);
      return;
    }

    // If profile exists but is not linked to a company (older/broken accounts), create a company and link it.
    if (!companyId && profileRow && !roleRow) {
      const newCompanyId = crypto.randomUUID();
      const defaultCompanyName = `${getUserFullName(authUser)} Company`;

      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          id: newCompanyId,
          name: defaultCompanyName,
          owner_id: userId,
          country_code: 'EG',
          timezone: 'Africa/Cairo',
          default_currency: 'EGP',
        });

      if (companyError) throw companyError;

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ company_id: newCompanyId })
        .eq('user_id', userId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      const { data: createdRole, error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          company_id: newCompanyId,
          role: 'owner',
        })
        .select('role, company_id')
        .single();

      if (roleError) throw roleError;

      const { error: subError } = await supabase.from('subscriptions').insert({
        company_id: newCompanyId,
        status: 'trial',
        plan_name: 'trial',
      });

      if (subError) throw subError;

      setProfile(updatedProfile as UserProfile);
      setUserRole(createdRole as UserRole);
      return;
    }

    // If profile exists but isn't linked, but role has company_id, backfill company_id.
    if (profileRow && !profileRow.company_id && companyId) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ company_id: companyId })
        .eq('user_id', userId)
        .select('*')
        .maybeSingle();

      if (updateError) throw updateError;
      if (updatedProfile) profileRow = updatedProfile as UserProfile;
    }

    // If profile is missing but role provides company_id, create a minimal profile.
    if (!profileRow) {
      const { data: createdProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          company_id: companyId,
          full_name: getUserFullName(authUser),
          email: authUser.email ?? '',
        })
        .select('*')
        .single();

      if (profileError) throw profileError;
      profileRow = createdProfile as UserProfile;
    }

    setProfile(profileRow);
    setUserRole(roleRow);
  };

  useEffect(() => {
    const hydrateFromSession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      // Defer data fetching to avoid auth deadlocks.
      setTimeout(() => {
        fetchUserData(nextSession.user)
          .catch((error) => {
            console.error('Error fetching user data:', error);
            setProfile(null);
            setUserRole(null);
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

  const signUp = async (email: string, password: string, fullName: string, companyName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      // If email confirmation is enabled, session can be null.
      if (!authData.session) {
        throw new Error('Please confirm your email to finish signup, then sign in.');
      }

      const userId = authData.user.id;
      const companyId = crypto.randomUUID();

      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          id: companyId,
          name: companyName,
          owner_id: userId,
          country_code: 'EG',
          timezone: 'Africa/Cairo',
          default_currency: 'EGP',
        });

      if (companyError) throw companyError;

      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: userId,
        company_id: companyId,
        full_name: fullName,
        email,
      });

      if (profileError) throw profileError;

      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: userId,
        company_id: companyId,
        role: 'owner',
      });

      if (roleError) throw roleError;

      const { error: subError } = await supabase.from('subscriptions').insert({
        company_id: companyId,
        status: 'trial',
        plan_name: 'trial',
      });

      if (subError) throw subError;

      return { error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { error: error as Error };
    }
  };

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

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Google signin error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(null);
  };

  const isAdmin = useMemo(
    () => userRole?.role === 'owner' || userRole?.role === 'admin',
    [userRole?.role]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        userRole,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

