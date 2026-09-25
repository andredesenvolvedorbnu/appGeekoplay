import { AppShell } from '@/components/app-shell';
import { LevelUpWatcher } from '@/components/level-up-watcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { StatusBenefitNotice } from '@/components/status-benefit-notice';
import { GeekoPlayShareProvider } from '@/components/geekoplay-share-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>
    <ThemeToggle/>
    <LevelUpWatcher/>
    <StatusBenefitNotice/>
    <GeekoPlayShareProvider/>
    {children}
  </AppShell>;
}
