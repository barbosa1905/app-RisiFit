import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme(); // 'light' ou 'dark'
  const [theme, setTheme] = useState(systemColorScheme || 'light');

  // Sincroniza com o tema do sistema
  useEffect(() => {
    setTheme(systemColorScheme);
  }, [systemColorScheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const themeColors = {
    light: {
      background: '#f9fafb',
      text: '#1e293b',
      cardBackground: '#fff',
      border: '#000',
      accent: '#d0a956',
      subtext: '#6b7280',
    },
    dark: {
      background: '#111827',
      text: '#f9fafb',
      cardBackground: '#1f2937',
      border: '#374151',
      accent: '#d0a956',
      subtext: '#9ca3af',
    },
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: themeColors[theme],
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
