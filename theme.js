const THEME_STORAGE_KEY = 'theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

export function readThemeColor(cssVariableName) {
  return getComputedStyle(document.documentElement).getPropertyValue(cssVariableName).trim();
}

function getActiveTheme() {
  const explicitTheme = document.documentElement.getAttribute('data-theme');
  if (explicitTheme) return explicitTheme;

  const systemPrefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  return systemPrefersDark ? DARK_THEME : LIGHT_THEME;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function initializeThemeToggle(onThemeChange) {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme) document.documentElement.setAttribute('data-theme', storedTheme);

  const toggleButton = document.getElementById('theme-toggle');
  toggleButton.addEventListener('click', () => {
    const nextTheme = getActiveTheme() === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    applyTheme(nextTheme);
    onThemeChange();
  });
}
