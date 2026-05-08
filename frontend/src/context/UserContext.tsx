import { type ReactNode, createContext, useContext, useState } from "react";

export interface UserProfile {
  user_id: string;
  username: string;
  email: string;
  avatar?: string;
  wins?: number;
  losses?: number;
  rank?: number;
}

interface UserContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile) => void;
  clearUser: () => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  const clearUser = () => setUser(null);
  const isAuthenticated = user !== null;

  return (
    <UserContext.Provider value={{ user, setUser, clearUser, isAuthenticated }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
