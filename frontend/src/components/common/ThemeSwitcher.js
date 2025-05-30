import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Button from 'react-bootstrap/Button';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeSwitcher = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant="" onClick={toggleTheme} size="sm"  className="ms-2 border-0 p-0 m-0" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      {theme === 'light' ? <FaMoon /> : <FaSun />}
    </Button>
  );
};

export default ThemeSwitcher;