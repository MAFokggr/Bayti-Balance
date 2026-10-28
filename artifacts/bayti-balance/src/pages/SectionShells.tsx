import { Link } from 'wouter';
import { Activity, ArrowLeft, ArrowRight, Leaf, MoonStar } from 'lucide-react';
import { CameraCoach } from '@/components/CameraCoach';
import type { Member } from '@/lib/family-types';

export function CameraPage({ current, updateRep, initialCounts }: { current: Member; updateRep: (exercise:string,reps:number)=>void; initialCounts: Record<string,number> }) {
  return <main className="page motion-in"><Link href="/home" className="eyebrow" style={{display:'inline-flex',alignItems:'center',gap:4}}><ArrowLeft size={15}/> Back home</Link><div style={{marginTop:16}} className="eyebrow">Move practice · {current.name}</div><h1 className="title" style={{fontSize:37}}>Camera<br/>coach.</h1><p className="copy" style={{marginBottom:17}}>A private practice space. Choose a movement and go at your own pace.</p><CameraCoach key={current.id} member={current.name} onRep={updateRep} initialCounts={initialCounts}/><p className="copy" style={{fontSize:11,marginTop:15}}>Camera access is optional. You can try the clearly labeled Demo Mode instead.</p></main>;
}

export function ShellPage({ section, current }: { section: 'move'|'eat'|'recover'; current: Member }) {
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
function CamelIllustration() {
  return <svg className="move-camel" viewBox="0 0 112 72" role="img" aria-label="Friendly camel illustration">
    <path d="M13 47c4-9 8-12 14-12 6 0 8-13 17-13 9 0 9 13 15 13 6 0 8-12 16-12 9 0 12 12 17 13 5 1 7 5 7 11H83c-5 0-8-2-11-5-3 4-7 5-13 5H34c-5 0-8-2-11-5l-6 10h-5l2-5-5 3-3-3 7-5Z" fill="#F6D477" stroke="#17264D" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M29 49v12m8-12v12m31-12v12m8-12v12" stroke="#17264D" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="96" cy="34" r="1.8" fill="#17264D"/><path d="M98 40q3 2 5 0" stroke="#17264D" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="m91 29 1-5 4 4" fill="#F59B7A" stroke="#17264D" strokeWidth="2" strokeLinejoin="round"/>
  </svg>;
}
