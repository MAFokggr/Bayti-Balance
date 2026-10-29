import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import { Activity, Check, ChevronDown, Droplets, Info, Trophy, Users } from 'lucide-react';
import { useFamilyStore } from '@/hooks/use-family-store';
import { dayKey } from '@/lib/family-data';
import { Logo, MemberAvatar, StorageBanner } from '@/components/shared/kit';
import RegisterPage from '@/pages/shared/RegisterPage';
import WhoPage from '@/pages/shared/WhoPage';
import HomePage from '@/pages/shared/HomePage';
import ProgressPage from '@/pages/shared/ProgressPage';
import AboutPage from '@/pages/shared/AboutPage';
import { CameraPage } from '@/pages/SectionShells';
import RecoverPage from '@/pages/recover/RecoverPage';
import MoveSection from '@/pages/move/MoveSection';
import EatSection from '@/pages/eat/EatSection';
import { AboutGameDay, CoolDownPage, GameDayRoute, PlayHub, ScoresPage } from '@/pages/game-day/GameDayPages';
import './shared-layer.css';

const queryClient = new QueryClient();
const EXERCISES = ['squat', 'arm raise', 'side step', 'jump', 'high knees'];
const NAV = [['/play', 'Play', Users], ['/move', 'Warm-up', Activity], ['/scores', 'Scores', Trophy], ['/cool-down', 'Cool-down', Droplets], ['/about', 'About', Info]] as const;

function App() {
  const store = useFamilyStore();
  const { data, current } = store;
  const [location] = useLocation();
  const [familyOpen, setFamilyOpen] = useState(false);
  const isIntro = ['/', '/welcome', '/register', '/who'].includes(location);
  const isShared = isIntro || ['/home', '/progress', '/about', '/play', '/scores', '/cool-down', '/game-day'].includes(location);
  const today = dayKey();
  const initialCounts = Object.fromEntries(EXERCISES.map((ex) => [ex, data.reps[`${current.id}:${today}:${ex}`] ?? 0]));

  return <div className="app-frame">
    <div className="frame-content">
      <StorageBanner error={store.storageError} retry={store.retryStorage} />
      {!isShared && <header className="topbar"><Link href="/home" aria-label="Home"><Logo /></Link></header>}
      {familyOpen && <div className="family-pop" role="menu" aria-label="Choose family member">
        {data.members.map((member) => <button key={member.id} className={`member-choice ${current.id === member.id ? 'selected' : ''}`} onClick={() => { store.selectMember(member.id); setFamilyOpen(false); }} role="menuitem" data-testid={`switch-member-${member.id}`}>
          <MemberAvatar member={member} size={33} /><span>{member.name}<small>{member.role}</small></span>{current.id === member.id && <Check size={15} style={{ marginLeft: 'auto' }} />}
        </button>)}
      </div>}
      <Switch>
        <Route path="/"><PlayHub /></Route>
        <Route path="/welcome"><PlayHub /></Route>
        <Route path="/register"><RegisterPage store={store} /></Route>
        <Route path="/who"><WhoPage store={store} /></Route>
        <Route path="/home"><HomePage store={store} /></Route>
        <Route path="/camera-test"><CameraPage current={current} updateRep={store.updateReps} initialCounts={initialCounts} /></Route>
        <Route path="/move/:section?"><MoveSection store={store} /></Route>
        <Route path="/eat/:section?"><EatSection store={store} /></Route>
        <Route path="/recover"><RecoverPage store={store} /></Route>
        <Route path="/progress"><ProgressPage store={store} /></Route>
        <Route path="/about-original"><AboutPage store={store} /></Route>
        <Route path="/play"><PlayHub /></Route>
        <Route path="/game-day"><GameDayRoute store={store} /></Route>
        <Route path="/scores"><ScoresPage /></Route>
        <Route path="/cool-down"><CoolDownPage /></Route>
        <Route path="/about"><AboutGameDay store={store} /></Route>
        <Route component={NotFound} />
      </Switch>
    </div>
    {location !== '/register' && <>
      <button className="family-fab" onClick={() => setFamilyOpen(!familyOpen)} aria-expanded={familyOpen} aria-label={`Switch family member, current member ${current.name}`} title={`Current member: ${current.name}`} data-testid="button-member-switcher">
        <MemberAvatar member={current} size={30} /><ChevronDown size={12} />
      </button>
      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV.map(([href, label, I]) => {
          const active = location === href || (href === '/move' && (location === '/camera-test' || location.startsWith('/move/'))) || (href === '/play' && location === '/game-day') || (href === '/cool-down' && location === '/recover');
          return <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} data-testid={`nav-${label.toLowerCase()}`}><I /><span>{label}</span></Link>;
        })}
      </nav>
    </>}
  </div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Root() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><App /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}
export default Root;
