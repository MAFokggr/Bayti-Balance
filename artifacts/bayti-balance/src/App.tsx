import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import { Activity, ArrowLeft, ArrowRight, Check, ChevronDown, CircleHelp, Home, Leaf, MoonStar, RotateCcw, TrendingUp, Users, Utensils } from 'lucide-react';
import { CameraCoach } from '@/components/CameraCoach';

const queryClient = new QueryClient();
type Member = {
  id: string; name: string; role: string; avatar: string; color: string;
  ageGroup: 'child' | 'teen' | 'adult' | 'senior'; fitness: 'gentle' | 'moderate' | 'active';
  foods: string[]; allergies: string[]; restrictions: string[]; goal: string;
  sleepTarget: number; waterMl: number; waterTarget: number; points: number; streak: number;
  privateCheckins: string[];
};
type FamilySettings = { weeklyGoal: number; cuisine: string; budget: number; language: string; indoorPref: boolean; minutes: number };
type DemoData = {
  family: string; activeMember: string; members: Member[]; familySettings: FamilySettings;
  reps: Record<string, number>; water: Record<string, number>; savedMeals: string[];
  savedPlaces: string[]; chores: string[]; planChanges: string[];
  joined: boolean; preferences: { reminders: boolean; displayName: string };
};
const DEFAULT_MEMBERS: Member[] = [
  { id: 'khalid', name: 'Khalid', role: 'Dad', avatar: 'KH', color: '#78D5C5', ageGroup: 'adult', fitness: 'moderate', foods: [], allergies: [], restrictions: [], goal: 'Build a healthy family routine', sleepTarget: 0, waterMl: 0, waterTarget: 0, points: 0, streak: 0, privateCheckins: [] },
  { id: 'mariam', name: 'Mariam', role: 'Mum', avatar: 'MA', color: '#F59B7A', ageGroup: 'adult', fitness: 'moderate', foods: [], allergies: [], restrictions: [], goal: 'Build a healthy family routine', sleepTarget: 0, waterMl: 0, waterTarget: 0, points: 0, streak: 0, privateCheckins: [] },
  { id: 'salem', name: 'Salem', role: '9 years old', avatar: 'SA', color: '#F6D477', ageGroup: 'child', fitness: 'moderate', foods: [], allergies: [], restrictions: [], goal: 'Build a healthy family routine', sleepTarget: 0, waterMl: 0, waterTarget: 0, points: 0, streak: 0, privateCheckins: [] },
  { id: 'noura', name: 'Noura', role: '6 years old', avatar: 'NO', color: '#A9D9B8', ageGroup: 'child', fitness: 'gentle', foods: [], allergies: [], restrictions: [], goal: 'Build a healthy family routine', sleepTarget: 0, waterMl: 0, waterTarget: 0, points: 0, streak: 0, privateCheckins: [] },
  { id: 'fatima', name: 'Jidda Fatima', role: 'Grandmother', avatar: 'JF', color: '#CDBBEA', ageGroup: 'senior', fitness: 'gentle', foods: [], allergies: [], restrictions: [], goal: 'Build a healthy family routine', sleepTarget: 0, waterMl: 0, waterTarget: 0, points: 0, streak: 0, privateCheckins: [] },
];
const STORAGE_KEY = 'bayti-balance-demo-v1';
const DEFAULT_DATA: DemoData = {
  family: 'Al Mansoori', activeMember: 'salem', members: DEFAULT_MEMBERS,
  familySettings: { weeklyGoal: 0, cuisine: '', budget: 0, language: 'English', indoorPref: false, minutes: 0 },
  reps: {}, water: {}, savedMeals: [], savedPlaces: [], chores: [], planChanges: [],
  joined: false, preferences: { reminders: false, displayName: '' },
};
function readData(): DemoData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<DemoData>;
      return {
        ...DEFAULT_DATA,
        ...parsed,
        members: Array.isArray(parsed.members) ? parsed.members : DEFAULT_MEMBERS,
        familySettings: { ...DEFAULT_DATA.familySettings, ...parsed.familySettings },
        preferences: { ...DEFAULT_DATA.preferences, ...parsed.preferences },
      };
    }
  } catch { /* use the sample household when storage is unavailable */ }
  return DEFAULT_DATA;
}

function Logo() {
  return <div className="brand"><div className="brand-mark" aria-hidden="true"><Home strokeWidth={2.6}/></div><span>bayti balance</span></div>;
}

function App() {
  const [data, setData] = useState<DemoData>(readData);
  const [location, setLocation] = useLocation();
  const [familyOpen, setFamilyOpen] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* local demo still works in memory */ }
  }, [data]);
  const current = data.members.find((m) => m.id === data.activeMember) ?? data.members[0];
  const selectMember = (id: string) => { setData((old) => ({ ...old, activeMember: id })); setFamilyOpen(false); };
  const updateRep = (exercise: string, reps: number) => {
    const key = `${data.activeMember}:${new Date().toISOString().slice(0,10)}:${exercise}`;
    setData((old) => ({ ...old, reps: { ...old.reps, [key]: reps } }));
  };
  const reset = () => {
    setData({ ...DEFAULT_DATA, members: DEFAULT_MEMBERS.map((member) => ({ ...member })) });
    setFamilyOpen(false); setLocation('/welcome');
  };
  const isIntro = ['/welcome','/register','/who'].includes(location);
  const pageContext = { data, setData, current, selectMember, reset };

  return <div className="app-frame">
    <div className="frame-content">
      {!isIntro && <header className="topbar"><Logo/></header>}
      {familyOpen && <div className="family-pop" role="menu" aria-label="Choose family member">{data.members.map((member) => <button key={member.id} className={`member-choice ${current.id === member.id ? 'selected' : ''}`} onClick={() => selectMember(member.id)} role="menuitem"><span className="member-avatar">{member.name.split(' ').map((p)=>p[0]).join('').slice(0,2)}</span><span>{member.name}<small>{member.role}</small></span>{current.id === member.id && <Check size={15} style={{marginLeft:'auto'}}/>}</button>)}</div>}
      <Switch>
        <Route path="/"><Welcome {...pageContext}/></Route>
        <Route path="/welcome"><Welcome {...pageContext}/></Route>
        <Route path="/register"><Register {...pageContext}/></Route>
        <Route path="/who"><Who {...pageContext}/></Route>
        <Route path="/home"><HomePage {...pageContext}/></Route>
        <Route path="/camera-test"><CameraPage current={current} updateRep={updateRep} initialCounts={Object.fromEntries(['squat','arm raise','side step','jump','high knees'].map((exercise) => [`${exercise}`, data.reps[`${data.activeMember}:${new Date().toISOString().slice(0,10)}:${exercise}`] ?? 0]))}/></Route>
        <Route path="/move"><ShellPage section="move" current={current}/></Route>
        <Route path="/eat"><ShellPage section="eat" current={current}/></Route>
        <Route path="/recover"><ShellPage section="recover" current={current}/></Route>
        <Route path="/progress"><ProgressPage {...pageContext}/></Route>
        <Route path="/about"><AboutPage {...pageContext}/></Route>
        <Route component={NotFound}/>
      </Switch>
    </div>
    <button className="family-fab" onClick={() => setFamilyOpen(!familyOpen)} aria-expanded={familyOpen} aria-label={`Switch family member, current member ${current.name}`} title={`Current member: ${current.name}`}>
      <span className="avatar-dot">{current.name.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><ChevronDown size={14}/>
    </button>
    <nav className="bottom-nav" aria-label="Main navigation">
      {[['/home','Home',Home],['/move','Move',Activity],['/eat','Eat',Utensils],['/recover','Recover',MoonStar],['/progress','Progress',TrendingUp]].map(([href,label,Icon]) => {
        const I = Icon as typeof Home;
        const active = location === href || (location === '/camera-test' && href === '/move');
        return <Link key={href as string} href={href as string} className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}><I/><span>{label as string}</span></Link>;
      })}
    </nav>
  </div>;
}

type Shared = { data: DemoData; setData: React.Dispatch<React.SetStateAction<DemoData>>; current: Member; selectMember: (id: string) => void; reset: () => void };
function Welcome({ data }: Shared) {
  return <main className="page motion-in" style={{paddingTop:30}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><Logo/><span className="eyebrow">UAE family prototype</span></div>
    <div style={{marginTop:38}} className="eyebrow">One family. Different needs. One healthier day.</div>
    <h1 className="title" style={{fontSize:48,marginTop:12}}>Wellbeing<br/>starts at <span style={{color:'#398b85'}}>home.</span></h1>
    <p className="copy">A little movement, food, and rest—made to fit your family. Start with one small moment together.</p>
    <div className="card" style={{marginTop:25,background:'#e4eee3',border:0}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}><div className="brand-mark"><Activity size={20}/></div><div><div style={{fontWeight:900}}>{data.family}</div><div className="copy" style={{fontSize:12}}>Your private demo household · saved on this device</div></div></div>
      <div className="grid-links" style={{marginTop:17}}><Link className="shell-link" href="/home"><Home/><span>Open family home</span></Link><Link className="shell-link" href="/camera-test"><CameraCoachIcon/><span>Try camera test</span></Link></div>
    </div>
    <div className="eyebrow" style={{margin:'25px 0 10px'}}>Your Bayti spaces</div>
    <div className="grid-links">
      <Link href="/move" className="shell-link" style={{background:'#f6dec9'}}><Activity/><span>Move · a colorful desert day</span></Link>
      <Link href="/eat" className="shell-link"><Utensils/><span>Eat · coming next</span></Link>
      <Link href="/recover" className="shell-link" style={{background:'#242a55',color:'#fff'}}><MoonStar/><span style={{color:'#d8d1f5'}}>Recover · coming next</span></Link>
      <Link href="/progress" className="shell-link"><TrendingUp/><span>Progress · demo activity</span></Link>
    </div>
    <div style={{marginTop:24,display:'flex',gap:9}}><Link className="button full" href="/register">Set up family <ArrowRight size={17}/></Link><Link className="button button-quiet" href="/about" aria-label="About Bayti"><CircleHelp/></Link></div>
    <Link href="/who" className="eyebrow" style={{display:'flex',justifyContent:'center',marginTop:15,textTransform:'none',letterSpacing:0}}>Choose a family member <UsersIcon/></Link>
  </main>;
}
function CameraCoachIcon() { return <Activity size={20}/>; }

function Register({ data, setData }: Shared) {
  const [, go] = useLocation();
  const [name, setName] = useState(data.preferences.displayName);
  const [family, setFamily] = useState(data.family);
  return <main className="page motion-in" style={{paddingTop:30}}>
    <Link href="/welcome" className="eyebrow"><ArrowLeft size={15}/> Back to welcome</Link><h1 className="title">Make it<br/>your family.</h1>
    <p className="copy">This prototype keeps your family details in this browser only.</p>
      <form className="card" style={{marginTop:20,display:'grid',gap:14}} onSubmit={(e) => { e.preventDefault(); setData((old) => ({...old,family:family.trim() || old.family,joined:true,preferences:{...old.preferences,displayName:name.trim()}})); go('/who'); }}>
      <label className="eyebrow">Family name<input className="exercise-select" value={family} onChange={(e)=>setFamily(e.target.value)} aria-label="Family name"/></label>
      <label className="eyebrow">Your name<input className="exercise-select" value={name} onChange={(e)=>setName(e.target.value)} placeholder="For example, Omar" aria-label="Your name"/></label>
      <button className="button full" type="submit">Continue <ArrowRight size={16}/></button>
    </form>
    <p className="copy" style={{fontSize:12,marginTop:13}}>No account or server connection is needed. Your data stays in local storage.</p>
  </main>;
}
function Who({ data, current, selectMember }: Shared) {
  const [, go] = useLocation();
  return <main className="page motion-in" style={{paddingTop:26}}>
    <div className="eyebrow">{data.family}</div><h1 className="title">Who’s here<br/>today?</h1><p className="copy">Choose a family member. Move coaching adjusts to the person using it.</p>
    <div style={{display:'grid',gap:9,marginTop:20}}>{data.members.map((m)=><button key={m.id} className={`member-choice card ${current.id===m.id?'selected':''}`} style={{padding:13}} onClick={()=>{selectMember(m.id);go('/home')}}><span className="member-avatar">{m.name.split(' ').map((p)=>p[0]).join('').slice(0,2)}</span><span>{m.name}<small>{m.role}</small></span>{current.id===m.id&&<Check size={17} style={{marginLeft:'auto'}}/>}</button>)}</div>
  </main>;
}
function HomePage({ data, current }: Shared) {
  const todayReps = Object.entries(data.reps).filter(([key])=>key.startsWith(`${current.id}:${new Date().toISOString().slice(0,10)}:`)).reduce((sum,[,v])=>sum+v,0);
  return <main className="page motion-in">
    <div className="eyebrow">Al Mansoori family · {new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</div>
    <h1 className="title" style={{fontSize:38}}>A good day,<br/>{current.name}.</h1>
    <p className="copy">Small moments count. What feels right for you today?</p>
    <div className="card" style={{marginTop:20,background:'#e3eee4',border:0}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div className="eyebrow">Move today</div><div style={{fontSize:26,fontWeight:900,marginTop:2}}>{todayReps} <span style={{fontSize:14}}>reps</span></div></div><Activity size={25} color="#387c71"/></div>
      <Link href="/camera-test" className="button full" style={{marginTop:13}}>Start a camera practice <ArrowRight size={16}/></Link>
    </div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',margin:'24px 0 10px'}}><span className="eyebrow">Your family spaces</span><Link href="/about" className="eyebrow" style={{textTransform:'none',letterSpacing:0}}>About</Link></div>
    <div className="grid-links">
      <Link href="/move" className="shell-link" style={{background:'#f4dfcb'}}><Activity/><span>Move<br/>Find your rhythm</span></Link>
      <Link href="/eat" className="shell-link"><Utensils/><span>Eat<br/>Coming next</span></Link>
      <Link href="/recover" className="shell-link" style={{background:'#252b57',color:'white'}}><MoonStar/><span style={{color:'#d8d1f5'}}>Recover<br/>Coming next</span></Link>
      <Link href="/progress" className="shell-link"><TrendingUp/><span>Progress<br/>See your practice</span></Link>
    </div>
    <p className="copy" style={{fontSize:11,marginTop:22}}>Bayti Balance is an educational prototype. It does not diagnose medical conditions or replace advice from a qualified professional.</p>
  </main>;
}

function UsersIcon() { return <Users size={15}/>; }
function CameraPage({ current, updateRep, initialCounts }: { current: Member; updateRep: (exercise:string,reps:number)=>void; initialCounts: Record<string,number> }) {
  return <main className="page motion-in"><Link href="/home" className="eyebrow" style={{display:'inline-flex',alignItems:'center',gap:4}}><ArrowLeft size={15}/> Back home</Link><div style={{marginTop:16}} className="eyebrow">Move practice · {current.name}</div><h1 className="title" style={{fontSize:37}}>Camera<br/>coach.</h1><p className="copy" style={{marginBottom:17}}>A private practice space. Choose a movement and go at your own pace.</p><CameraCoach member={current.name} onRep={updateRep} initialCounts={initialCounts}/><p className="copy" style={{fontSize:11,marginTop:15}}>Camera access is optional. You can try the clearly labeled Demo Mode instead.</p></main>;
}

function ShellPage({ section, current }: { section: 'move'|'eat'|'recover'; current: Member }) {
  const isMove = section === 'move', isRecover = section === 'recover';
  const title = isMove ? 'Move' : isRecover ? 'Recover' : 'Eat';
  return <main className={`motion-in ${isMove?'move-shell':isRecover?'recover-shell':'eat-shell'}`}>
    {isRecover && <div className="stars"/>}
    <div className="page" style={{position:'relative',zIndex:1,paddingTop:25}}>
      <div className="eyebrow">{isMove?'A little more movement':isRecover?'Rest is part of the rhythm':'Food, shared with care'}</div>
      <h1 className="title">{title}<br/><span style={{fontSize:28,fontWeight:700}}>for {current.name}</span></h1>
      {isMove ? <>
        <p className="copy">Find a comfortable pace. Your family’s movement space is growing.</p>
        <div className="move-banner"><div className="eyebrow" style={{color:'#d8eee4'}}>A practice to try</div><h2 style={{fontSize:23,lineHeight:1.1,margin:'8px 0'}}>Stand tall.<br/>Move with ease.</h2><p style={{fontSize:13,marginBottom:0}}>Use the camera coach when you’re ready.</p><CamelIllustration/></div>
        <Link className="button" href="/camera-test">Open camera practice <ArrowRight size={16}/></Link>
      </> : <div className="card" style={{marginTop:30}}>
        <div style={{width:48,height:48,borderRadius:16,display:'grid',placeItems:'center',background:isRecover?'#eee9ff':'#e3eee4'}}>{isRecover?<MoonStar/>:<Leaf/>}</div>
        <h2 style={{fontSize:22,margin:'17px 0 6px'}}>Coming next</h2>
        <p className="copy">This space is intentionally a shell for the school prototype. {isRecover?'Rest and routines will have a home here.':'Family food moments will have a home here.'}</p>
        <Link href="/home" className="button button-secondary" style={{marginTop:7}}>Back to family home</Link>
      </div>}
      {isMove && <div className="card" style={{marginTop:18}}><div className="eyebrow">Your next step</div><p style={{fontWeight:900,marginBottom:5}}>Try a short camera session</p><p className="copy" style={{fontSize:13}}>Camera use is optional. Demo mode is clearly labeled and does not analyze movement.</p></div>}
    </div>
  </main>;
}
function ProgressPage({ data, current }: Shared) {
  const currentDay = new Date().toISOString().slice(0,10);
  const rows = Object.entries(data.reps).filter(([key])=>key.startsWith(`${current.id}:`));
  const total = rows.reduce((sum,[,reps])=>sum+reps,0);
  return <main className="page motion-in"><div className="eyebrow">A record of practice</div><h1 className="title">Your<br/>progress.</h1><p className="copy">Small steps, noticed. This demo history stays in your browser.</p>
    <div className="card" style={{marginTop:20,background:'#e3eee4',border:0}}><div className="eyebrow">Today · {current.name}</div><div style={{fontWeight:900,fontSize:46,letterSpacing:'-.06em',margin:'3px 0'}}>{rows.filter(([k])=>k.includes(currentDay)).reduce((s,[,v])=>s+v,0)}<span style={{fontSize:16,letterSpacing:0}}> reps</span></div><div className="copy" style={{fontSize:13}}>Across your camera practice</div></div>
    <h2 style={{fontSize:20,margin:'25px 0 11px'}}>Recent practice</h2>
    {rows.length ? <div style={{display:'grid',gap:8}}>{rows.map(([key,reps])=><div className="card" key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:14}}><span style={{fontWeight:800,textTransform:'capitalize'}}>{key.split(':')[2]}<small style={{display:'block',fontWeight:600,color:'#657789',marginTop:3}}>{key.split(':')[1]}</small></span><strong>{reps} reps</strong></div>)}</div> : <div className="card" style={{textAlign:'center',padding:23}}><Activity size={27} color="#4489c5"/><p style={{fontWeight:900,marginBottom:5}}>Your first practice is waiting</p><p className="copy" style={{fontSize:13}}>Reps from your camera session will appear here.</p><Link href="/camera-test" className="button">Try a practice</Link></div>}
    <p className="copy" style={{fontSize:11,marginTop:17}}>Total saved reps: {total}. Reset the demo from About.</p>
  </main>;
}
function CamelIllustration() {
  return <svg className="move-camel" viewBox="0 0 112 72" role="img" aria-label="Friendly camel illustration">
    <path d="M13 47c4-9 8-12 14-12 6 0 8-13 17-13 9 0 9 13 15 13 6 0 8-12 16-12 9 0 12 12 17 13 5 1 7 5 7 11H83c-5 0-8-2-11-5-3 4-7 5-13 5H34c-5 0-8-2-11-5l-6 10h-5l2-5-5 3-3-3 7-5Z" fill="#F6D477" stroke="#17264D" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M29 49v12m8-12v12m31-12v12m8-12v12" stroke="#17264D" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="96" cy="34" r="1.8" fill="#17264D"/><path d="M98 40q3 2 5 0" stroke="#17264D" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="m91 29 1-5 4 4" fill="#F59B7A" stroke="#17264D" strokeWidth="2" strokeLinejoin="round"/>
  </svg>;
}
function AboutPage({ reset, data, setData }: { reset:()=>void; data: DemoData; setData: React.Dispatch<React.SetStateAction<DemoData>> }) {
  const [confirm, setConfirm] = useState(false);
  return <main className="page motion-in"><div className="eyebrow">Made for a school project in the UAE</div><h1 className="title">About<br/>Bayti.</h1><p className="copy">Bayti means “my home.” This prototype helps one family share a healthier day while making movement practice feel personal.</p>
    <div className="card" style={{marginTop:20}}><div style={{display:'flex',alignItems:'center',gap:12}}><div className="brand-mark"><Home/></div><div><strong>Bayti Balance</strong><div className="copy" style={{fontSize:12}}>Family wellbeing prototype</div></div></div>
      <p className="copy" style={{fontSize:13,marginTop:16}}>Bayti Balance is an educational prototype. It does not diagnose medical conditions or replace advice from a qualified professional.</p>
      <div style={{borderTop:'1px solid #e6dfd2',paddingTop:14,marginTop:14}}><div className="eyebrow">Your privacy</div><p className="copy" style={{fontSize:13}}>Family preferences and demo progress stay in this browser. Camera video is processed locally and is never recorded or uploaded.</p></div>
    </div>
    <div className="card" style={{marginTop:14}}><div className="eyebrow">Demo controls</div><p className="copy" style={{fontSize:13}}>Clear this device’s demo progress and return to welcome.</p>{confirm?<div style={{display:'flex',gap:8}}><button className="button" onClick={reset}><RotateCcw size={15}/> Confirm reset</button><button className="button button-quiet" onClick={()=>setConfirm(false)}>Cancel</button></div>:<button className="button button-quiet" onClick={()=>setConfirm(true)}><RotateCcw size={15}/> Reset demo</button>}</div>
    <div className="card" style={{marginTop:14}}><div className="eyebrow">Family preferences</div><button className="member-choice" style={{padding:'12px 2px'}} onClick={()=>setData((old)=>({...old,preferences:{...old.preferences,reminders:!old.preferences.reminders}}))}><span className="member-avatar"><CircleHelp size={17}/></span><span>Gentle reminder preferences<small>{data.preferences.reminders?'Reminders are on':'Reminders are off'}</small></span><span className={`toggle-indicator ${data.preferences.reminders?'on':''}`} aria-label={data.preferences.reminders?'On':'Off'} /></button></div>
    <Link href="/welcome" className="eyebrow" style={{display:'inline-flex',marginTop:20}}>Welcome screen <ArrowRight size={15}/></Link>
  </main>;
}

function Router() {
  return <RoutedErrorBoundary><App/></RoutedErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Root() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
export default Root;
