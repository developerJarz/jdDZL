"use client";
import { createContext, useContext } from "react";
import { can, canAccessSection, type Permission } from "@/lib/permissions";

export interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
  staffRole: string;
  permissions: string[];
}

const MeContext = createContext<Me | null>(null);
export const MeProvider = MeContext.Provider;
export const useMe = () => useContext(MeContext);

export function useCan() {
  const me = useMe();
  return {
    me,
    can: (permission: Permission) => can(me, permission),
    section: (name: string) => canAccessSection(me, name),
  };
}
