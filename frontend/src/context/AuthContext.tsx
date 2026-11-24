import React, { createContext, useContext, useState } from 'react';

const ADMIN_SESSION_KEY = 'engwork_admin_session_v1';
const STUDENT_NAME_KEY = 'engwork_student_name_v1';

// Admin credentials
const ADMIN_USERNAME = 'annc19324';
const ADMIN_PASSWORD = 'Zeanokai@1';

interface AuthContextValue {
  isAdmin: boolean;
  adminUsername: string | null;
  loginAdmin: (username: string, password: string) => { ok: boolean; error?: string };
  logoutAdmin: () => void;
  studentName: string;
  saveStudentName: (name: string) => void;
  clearStudentName: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUsername, setAdminUsername] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.username === ADMIN_USERNAME) return parsed.username;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [studentName, setStudentName] = useState<string>(() => {
    try {
      return localStorage.getItem(STUDENT_NAME_KEY) || '';
    } catch {
      return '';
    }
  });

  const loginAdmin = (username: string, password: string) => {
    const cleanUser = username.trim();
    if (cleanUser === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setAdminUsername(cleanUser);
      try {
        localStorage.setItem(
          ADMIN_SESSION_KEY,
          JSON.stringify({ username: cleanUser, loggedInAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
      return { ok: true };
    }
    return { ok: false, error: 'Tài khoản hoặc mật khẩu Admin không chính xác.' };
  };

  const logoutAdmin = () => {
    setAdminUsername(null);
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const saveStudentName = (name: string) => {
    const trimmed = name.trim();
    setStudentName(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(STUDENT_NAME_KEY, trimmed);
      } else {
        localStorage.removeItem(STUDENT_NAME_KEY);
      }
    } catch {
      // ignore
    }
  };

  const clearStudentName = () => saveStudentName('');

  return (
    <AuthContext.Provider
      value={{
        isAdmin: Boolean(adminUsername),
        adminUsername,
        loginAdmin,
        logoutAdmin,
        studentName,
        saveStudentName,
        clearStudentName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
