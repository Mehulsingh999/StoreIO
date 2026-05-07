// src/contexts/AppContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../api";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [outlets, setOutlets] = useState([]);

  const refreshOutlets = useCallback(() => {
    api.getOutlets().then(d => Array.isArray(d) && setOutlets(d));
  }, []);

  useEffect(() => { refreshOutlets(); }, [refreshOutlets]);

  return (
    <AppContext.Provider value={{ outlets, refreshOutlets }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
