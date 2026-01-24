'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  signUp,
  signIn,
  signOut,
  getSession,
  updateProfile,
} from '@/lib/authService';

export interface User {
  id?: string;
  userId?: string;
  email?: string;
  payId?: string;
  publicKey?: string;
  firstName?: string;
  lastName?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  
  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
    }
    setLoading(false);
  }, []);

  const signup = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string
    ) => {
      try {
        setError(null);
        setLoading(true);

        const result = await signUp(email, password, firstName, lastName);

        const newUser = {
          ...result,
          firstName,
          lastName,
        } as User;

        setUser(newUser);
        localStorage.setItem('session', JSON.stringify(newUser));

        return newUser;
      } catch (err: any) {
        const errorMessage = err.message || 'Signup failed';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signin = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      const newUser = await signIn(email, password);
      setUser(newUser);

      return newUser;
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      await signOut();
      setUser(null);

      router.push('/');
    } catch (err: any) {
      const errorMessage = err.message || 'Logout failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const updateUserProfile = useCallback(
    async (firstName: string, lastName: string, avatarUrl?: string) => {
      try {
        setError(null);
        setLoading(true);

        const updated = await updateProfile(firstName, lastName, avatarUrl);
        setUser(updated);

        return updated;
      } catch (err: any) {
        const errorMessage = err.message || 'Update failed';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    user,
    loading,
    error,
    signup,
    signin,
    logout,
    updateUserProfile,
    isAuthenticated: !!user,
  };
}
