import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import * as api from '../services/supabase/api';
import type { PerfilUsuario, RolUsuario } from '../services/supabase/models';

// ─── Types ───

interface SupabaseContextValue {
  session: Session | null;
  profile: PerfilUsuario | null;
  isLoading: boolean;
  error: string | null;

  // Auth actions
  signUp: (email: string, password: string, rol?: RolUsuario) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Profile actions
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<PerfilUsuario> & { user_id: string }) => Promise<void>;

  // Utilidad
  getUserId: () => string | null;
}

// ─── Context ───

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

// ─── Provider ───

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PerfilUsuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar sesión al montar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const p = await api.getProfile(userId);
      setProfile(p);
    } catch {
      // El perfil puede no existir todavía
    }
  };

  const getUserId = useCallback(() => session?.user?.id ?? null, [session]);

  // ─── Auth actions ───

  const signUpFn = useCallback(
    async (email: string, password: string, rol: RolUsuario = 'paciente') => {
      setError(null);
      try {
        await api.signUp(email, password, rol);
      } catch (e: unknown) {
        const msg = (e as { message?: string }).message ?? 'Error al registrarse';
        setError(msg);
        throw e;
      }
    },
    [],
  );

  const signInFn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await api.signIn(email, password);
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? 'Error al iniciar sesión';
      setError(msg);
      throw e;
    }
  }, []);

  const signInWithGoogleFn = useCallback(async () => {
    setError(null);
    try {
      await api.signInWithGoogle();
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? 'Error con Google Sign-In';
      setError(msg);
      throw e;
    }
  }, []);

  const signOutFn = useCallback(async () => {
    setError(null);
    try {
      await api.signOut();
      setProfile(null);
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? 'Error al cerrar sesión';
      setError(msg);
    }
  }, []);

  // ─── Profile actions ───

  const refreshProfile = useCallback(async () => {
    const uid = getUserId();
    if (!uid) return;
    await loadProfile(uid);
  }, [getUserId]);

  const updateProfile = useCallback(
    async (data: Partial<PerfilUsuario> & { user_id: string }) => {
      const updated = await api.upsertProfile(data);
      setProfile(updated);
    },
    [],
  );

  // ─── Value ───

  const value: SupabaseContextValue = {
    session,
    profile,
    isLoading,
    error,
    signUp: signUpFn,
    signIn: signInFn,
    signInWithGoogle: signInWithGoogleFn,
    signOut: signOutFn,
    refreshProfile,
    updateProfile,
    getUserId,
  };

  return (
    <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
  );
}

// ─── Hook ───

export function useSupabase(): SupabaseContextValue {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error('useSupabase debe usarse dentro de un SupabaseProvider');
  }
  return ctx;
}

export { api };
