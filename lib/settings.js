"use client";

import { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState("sl");

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
    }
    
    const savedLang = localStorage.getItem("lang");
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  // Save theme to localStorage and apply
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Save language to localStorage
  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleLang = () => setLang(prev => prev === "sl" ? "en" : "sl");

  return (
    <SettingsContext.Provider value={{ 
      darkMode, 
      setDarkMode, 
      toggleDarkMode,
      lang, 
      setLang,
      toggleLang
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
