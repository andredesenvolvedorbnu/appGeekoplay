import { AppShell } from '@/components/app-shell';
import { LevelUpWatcher } from '@/components/level-up-watcher';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>
    <ThemeToggle/>
    <LevelUpWatcher/>
    {children}
  </AppShell>;
}
