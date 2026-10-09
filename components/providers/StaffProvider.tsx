"use client";

import React, { createContext, useContext } from "react";
import { StaffUser } from "@/lib/auth/staff";
import { FeaturePermission, hasPermission } from "@/lib/auth/permissions";

interface StaffContextType {
  staff: StaffUser;
  hasPerm: (permission: FeaturePermission) => boolean;
}

const StaffContext = createContext<StaffContextType | null>(null);

export function StaffProvider({ staff, children }: { staff: StaffUser; children: React.ReactNode }) {
  return (
    <StaffContext.Provider value={{ staff, hasPerm: (perm) => hasPermission(staff.role, perm) }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error("useStaff must be used within a StaffProvider");
  }
  return context;
}
