import React, { createContext, useState, useEffect, useCallback } from 'react';

export const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const localTheme = localStorage.getItem('app-theme');
    return localTheme || 'light'; // Default to light theme
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      return newTheme;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => React.useContext(ThemeContext);

// Note: Bootstrap 5 uses `data-bs-theme` on the `<html>` tag.
// If you were using custom CSS variables, you might set them on `document.body.className` or similar.