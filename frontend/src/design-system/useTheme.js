import { useThemeContext } from './ThemeProvider';

const FALLBACK = {
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
};

export function useTheme() {
  return useThemeContext() ?? FALLBACK;
}
