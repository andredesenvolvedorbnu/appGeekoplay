'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  localStorage.setItem('geekoplay-theme', theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('geekoplay-theme') as Theme | null;
    const resolved: Theme = saved === 'light' ? 'light' : 'dark';
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="fixed right-[8.75rem] top-3 z-[55] grid h-8 w-8 place-items-center rounded-lg border border-geek-line bg-geek-panel text-slate-300 shadow-lg transition hover:bg-geek-soft sm:right-[9.5rem]"
      aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>} 
    </button>
  );
}
