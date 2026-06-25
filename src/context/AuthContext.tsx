import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setSessionExpiredHandler } from '../apis/axiosInstance';
import { getToken, removeToken, saveToken } from '../utils/storage';

type AuthContextValue = {
  token: string | null;
  loading: boolean;
  setAuthToken: (nextToken: string) => Promise<void>;
  clearAuthToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStoredToken = async () => {
      try {
        const [storedToken] = await Promise.all([
          getToken(),
          new Promise<void>(resolve => setTimeout(resolve, 2000)),
        ]);
        setToken(storedToken);
      } finally {
        setLoading(false);
      }
    };

    loadStoredToken();
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      removeToken().finally(() => {
        setToken(null);
        setLoading(false);
        queryClient.clear();
      });
    });

    return () => setSessionExpiredHandler(null);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      loading,
      setAuthToken: async nextToken => {
        await saveToken(nextToken);
        setToken(nextToken);
        setLoading(false);
      },
      clearAuthToken: async () => {
        await removeToken();
        setToken(null);
        setLoading(false);
      },
    }),
    [loading, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
};
