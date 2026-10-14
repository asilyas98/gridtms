import React, { createContext, useContext, useState } from 'react';

export type ViewMode = 'simplified' | 'detailed';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  isSimplified: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const ViewModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Default to 'simplified' across all devices as requested
    const saved = localStorage.getItem('tms-view-mode');
    return saved === 'detailed' ? 'detailed' : 'simplified';
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('tms-view-mode', mode);
  };

  const toggleViewMode = () => {
    setViewModeState(prev => {
      const next = prev === 'simplified' ? 'detailed' : 'simplified';
      localStorage.setItem('tms-view-mode', next);
      return next;
    });
  };

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        toggleViewMode,
        isSimplified: viewMode === 'simplified'
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};
