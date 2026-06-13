'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';

type EditModeContextType = {
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  selectedIndexes: Set<number>;
  toggleIndex: (index: number) => void;
  clearSelection: () => void;
};

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());

  const toggleIndex = (index: number) => {
    const newSet = new Set(selectedIndexes);
    newSet.has(index) ? newSet.delete(index) : newSet.add(index);
    setSelectedIndexes(newSet);
  };

  const clearSelection = () => setSelectedIndexes(new Set());

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode, selectedIndexes, toggleIndex, clearSelection }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (!context) throw new Error('useEditMode must be used within EditModeProvider');
  return context;
}
