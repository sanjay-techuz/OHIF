import React, { createContext, useContext, useState, ReactNode } from 'react';

interface StudyBrowserHeaderContextType {
  headerContent: ReactNode | null;
  setHeaderContent: (content: ReactNode | null) => void;
}

const StudyBrowserHeaderContext = createContext<StudyBrowserHeaderContextType | undefined>(
  undefined
);

export const StudyBrowserHeaderProvider = ({ children }: { children: ReactNode }) => {
  const [headerContent, setHeaderContent] = useState<ReactNode | null>(null);

  return (
    <StudyBrowserHeaderContext.Provider value={{ headerContent, setHeaderContent }}>
      {children}
    </StudyBrowserHeaderContext.Provider>
  );
};

export const useStudyBrowserHeader = () => {
  const context = useContext(StudyBrowserHeaderContext);
  if (!context) {
    return { headerContent: null, setHeaderContent: () => {} };
  }
  return context;
};
