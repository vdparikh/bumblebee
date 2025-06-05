import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Button from 'react-bootstrap/Button';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeSwitcher = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant="" onClick={toggleTheme} size="sm"  className="" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      {theme === 'light' ? <FaMoon size="1.2em" /> : <FaSun size="1.2em" />}
    </Button>
  );
};

export default ThemeSwitcher;