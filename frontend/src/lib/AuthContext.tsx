import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, isDemoMode } from './firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  demoLogin: () => void;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
  demoLogin: () => {},
  isDemo: false,
});

// Minimal fake user for demo mode
const DEMO_USER = { email: 'demo@thesislab.dev', displayName: 'Demo User' } as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isDemoMode ? DEMO_USER : null);
  const [loading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    if (isDemoMode) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const logout = async () => {
    if (isDemoMode) {
      setUser(null);
      return;
    }
    await signOut(auth);
  };

  const demoLogin = () => {
    if (isDemoMode) setUser(DEMO_USER);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, demoLogin, isDemo: isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
