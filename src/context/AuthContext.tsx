'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserData {
  email?: string;
  companyName?: string;
  authProvider?: string;
  createdAt?: any;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  token: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Obtener el token JWT actual
        const idToken = await currentUser.getIdToken();
        setToken(idToken);

        // Obtener datos adicionales de Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      } else {
        setToken(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Opcional: Refrescar el token periódicamente si es necesario
  useEffect(() => {
    if (user) {
      const handleTokenRefresh = async () => {
        try {
          const idToken = await user.getIdToken(true);
          setToken(idToken);
        } catch (e) {
          console.error("Error refreshing token:", e);
        }
      };
      // Por ahora no configuramos intervalo, confiamos en la lógica base
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userData, loading, token }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
