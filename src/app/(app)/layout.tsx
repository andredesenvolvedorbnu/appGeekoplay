import { AppShell } from '@/components/app-shell';
import { LevelUpWatcher } from '@/components/level-up-watcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { StatusBenefitNotice } from '@/components/status-benefit-notice';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>
    <ThemeToggle/>
    <LevelUpWatcher/>
    <StatusBenefitNotice/>
    {children}
  </AppShell>;
}
