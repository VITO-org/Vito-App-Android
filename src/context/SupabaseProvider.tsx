import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import * as api from '../services/supabase/api';
import type { PerfilUsuario, DatosClinicosConfig, RolUsuario } from '../services/supabase/models';

// ─── Types ───

interface SupabaseContextValue {
  session: Session | null;
  profile: PerfilUsuario | null;
  isLoading: boolean;
  needsProfile: boolean;
  error: string | null;

  // Auth actions
  signUp: (email: string, password: string, rol?: RolUsuario) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Profile actions
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<PerfilUsuario> & { user_id: string }) => Promise<void>;
  updateClinicalConfig: (data: Partial<DatosClinicosConfig> & { id_usuario: string }) => Promise<void>;

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
  const [profileLoading, setProfileLoading] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(true); // empieza true; loadProfile lo pone false si hay perfil
  const [error, setError] = useState<string | null>(null);

  // No dep绳子 stales — loadProfile se define antes del effect
  const loadProfile = async (userId: string) => {
    try {
      const p = await api.getProfile(userId);
      setProfile(p);
      setNeedsProfile(!p);
    } catch {
      setNeedsProfile(false);
    }
  };

  // Cargar sesión al montar
  useEffect(() => {
    // Safety timeout: si getSession no responde en 8s, forzar salida del loading
    const safetyTimer = setTimeout(() => setIsLoading(false), 8000);

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        clearTimeout(safetyTimer);
        setSession(session);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
        setIsLoading(false);
      })
      .catch(() => {
        clearTimeout(safetyTimer);
        // Si getSession falla (AsyncStorage corrupto, etc.), igual mostrar la UI
        setIsLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          try {
            await loadProfile(session.user.id);
          } catch {
            // Si loadProfile falla acá, no es crítico — el listener de getSession ya avanzó
          }
        } else {
          setProfile(null);
          setNeedsProfile(false);
        }
      },
    );

    return () => {
      clearTimeout(safetyTimer);
      listener?.subscription.unsubscribe();
    };
  }, []);

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
      setNeedsProfile(false);
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
      setNeedsProfile(false);
    },
    [],
  );

  const updateClinicalConfig = useCallback(
    async (data: Partial<DatosClinicosConfig> & { id_usuario: string }) => {
      await api.upsertDatosClinicosConfig(data);
    },
    [],
  );

  // ─── Value ───

  const value: SupabaseContextValue = {
    session,
    profile,
    isLoading,
    needsProfile,
    error,
    signUp: signUpFn,
    signIn: signInFn,
    signInWithGoogle: signInWithGoogleFn,
    signOut: signOutFn,
    refreshProfile,
    updateProfile,
    updateClinicalConfig,
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
