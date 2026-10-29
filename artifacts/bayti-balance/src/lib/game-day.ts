import { markHeadCard, tickHead, type HeadMark, type HeadState } from './head';
import type { RasmState } from './rasm';
export const GAME_DAY_KEY = 'bayti-game-day-v1';
export type GameId = 'football' | 'hazawi' | 'heritage' | 'pearl' | 'manners' | 'rasm' | 'head';
export type Stage = 'choose' | 'players' | 'ready' | 'content' | 'record' | 'results' | 'tie';
export type Player = { id: string; name: string; avatar: string; color: string; team: 'A' | 'B' | null };
export type GameResult = { id: string; game: GameId; title: string; winner: string; scores: Record<string, number>; points: number; at: string };
export type GameDayState = {
  stage: Stage; game: GameId; players: Player[]; rounds: number; roundLength: number;
  round: number; turn: number; scores: Record<string, number>; goals: Record<string, number>;
  missionIndex: number; cardIndex: number; card: number[]; flipped: number[]; matched: string[];
  pearlPile: number; banked: Record<string, number>; results: GameResult[];
  oasis: number; highHeat: boolean; paused: boolean; seconds: number; completedRounds: number;
  teamAssignment: boolean; tieStage: number; notice: string; resultSaved: boolean; pearlDeck: string[]; individualMode: boolean; seenCards: string[];
  rasm?: RasmState | null; head?: HeadState | null;
};
export const GAME_CONFIGS = [
  { id:'football' as const, name:'Football: Majlis Cup', mode:'Team', players:'2–6 players', time:'2 × 3 min', color:'#78D5C5', icon:'⚽', points:'1 point per goal', penalty:'Hard tackle or kicking the ball away: host may deduct 1 point.', tie:'Golden goal (2 min), then one player each: 10 jumps; highest wins.', win:'Score more goals. The host types goals; Bayti never watches the match.', arabic:'', need:'A soft ball, clear indoor space and water bottles.', featured:true },
  { id:'rasm' as const, name:'Rasm Yalla', arabic:'رسم يلا', mode:'Team', players:'4–6 players', time:'6 turns · 30 sec', color:'#F6D477', icon:'🎨', points:'Correct guess = 2 points, +1 bonus with 10 or more seconds left. Wrong or timeout = 0.', penalty:'Letters, numbers or talking: the host taps Fix score.', tie:'One bonus word per team, repeated until one team leads.', win:'Most points after every turn.', need:'Paper not needed. One phone or laptop, or two windows of the same browser.', featured:true },
  { id:'head' as const, name:'Khamen on Head', arabic:'خمّن', mode:'Team or individual', players:'2–6 players', time:'60 sec · 5 cards a turn', color:'#A9D9B8', icon:'🤔', points:'Got it = 1 point. Each turn is scored out of 5.', penalty:'Saying, spelling or translating the name: tap Didn’t get it.', tie:'One extra 5-card turn each, repeated until one is ahead.', win:'Highest total across all turns.', need:'Phone or laptop only. Hold it facing the clue-givers.', featured:true },
  { id:'heritage' as const, name:'Heritage Match-Up', mode:'Individual', players:'2–4 players', time:'4 × 4 grid', color:'#CDBBEA', icon:'🦅', points:'1 point per matched pair; match means go again.', penalty:'No penalty for a miss.', tie:'One extra 6-card round.', win:'Find the most heritage pairs.', arabic:'', need:'Phone or laptop only, flat on a table.', featured:true },
  { id:'pearl' as const, name:'Pearl Diver', mode:'Individual', players:'2–4 players', time:'3 rounds each', color:'#78D5C5', icon:'🦪', points:'Pearls add 1, 2, 3 or 5; bank any time.', penalty:'Jellyfish loses the whole unbanked turn pile.', tie:'One dive each; highest single card wins.', win:'Bank the most pearls before your turns run out.', arabic:'', need:'Phone or laptop only, passed around.', featured:true },
  { id:'hazawi' as const, name:'Hazawi Riddles', mode:'Team', players:'2–6 players', time:'30 sec · 5 rounds', color:'#F6D477', icon:'🧩', points:'Correct = 2; second-try answer = 1; otherwise 0.', penalty:'Hint costs 1 point.', tie:'One sudden-death riddle.', win:'Teams alternate; the host decides whether the answer is correct.', arabic:'', need:'Phone or laptop only. The host reads aloud.', featured:false },
  { id:'manners' as const, name:'Majlis Manners', mode:'Team or individual', players:'2–6 players', time:'20 sec · 6 rounds', color:'#F59B7A', icon:'🫖', points:'Best choice = 2 points.', penalty:'No penalty for another answer.', tie:'One bonus scenario.', win:'Discuss together, then host reveals the family choice.', arabic:'', need:'Phone or laptop only. Sit together in a circle.', featured:false },
];
export const initialGameDay = (): GameDayState => ({
  stage:'choose', game:'football',
  players:[{id:'omar',name:'Omar',avatar:'O',color:'#78D5C5',team:'A'},{id:'jomana',name:'Jomana',avatar:'J',color:'#F59B7A',team:'B'}],
  rounds:2,roundLength:3,round:1,turn:0,scores:{A:0,B:0},goals:{A:0,B:0},missionIndex:0,cardIndex:0,
  card:[],flipped:[],matched:[],pearlPile:0,banked:{},results:[],oasis:0,highHeat:false,paused:false,seconds:0,completedRounds:0,teamAssignment:false,tieStage:0,notice:'',resultSaved:false,pearlDeck:[],individualMode:false,seenCards:[]
});
export function gameReducer(s: GameDayState, a: { type:string; [key:string]:any }): GameDayState {
  switch(a.type){
    case 'hydrate': return {...initialGameDay(),...a.state};
    case 'game': return {...s,game:a.game,stage:'players',rounds:({football:2,hazawi:5,heritage:1,pearl:3,manners:6,rasm:6,head:2} as const)[a.game as GameId],roundLength:({football:3,hazawi:30,heritage:0,pearl:30,manners:20,rasm:30,head:60} as const)[a.game as GameId],scores:{A:0,B:0},goals:{A:0,B:0},round:1,turn:0,missionIndex:0,cardIndex:0,card:[],flipped:[],matched:[],pearlPile:0,banked:{},resultSaved:false,pearlDeck:[],individualMode:false,notice:'',seenCards:[],paused:false,seconds:0,completedRounds:0,tieStage:0,rasm:null,head:null};
    case 'rasm': return {...s,rasm:a.rasm};
    case 'head': return {...s,head:a.head};
    case 'head-tick': return s.head?{...s,head:tickHead(s.head)}:s;
    case 'head-mark': return s.head?{...s,head:markHeadCard(s.head,a.mark as HeadMark)}:s;
    case 'custom-results': return {...s,scores:{...a.scores},notice:String(a.notice??''),stage:'results',resultSaved:false};
    case 'stage': return {...s,stage:a.stage};
    case 'players': return {...s,players:a.players};
    case 'config': return {...s,[a.key]:a.value};
    case 'ready': return {...s,stage:'content',round:1,turn:0,seconds:s.game==='football'?s.roundLength*60:s.game==='heritage'?0:s.roundLength,paused:false,cardIndex:0,flipped:[],matched:[],card:a.card ?? s.card,pearlDeck:[]};
    case 'pause': return {...s,paused:!s.paused};
    case 'tick': return s.paused||s.seconds<=0?s:{...s,seconds:s.seconds-1};
    case 'timer-expired': {
      if(s.seconds>0)return s;
      if(s.stage==='tie'&&s.game==='football'&&s.tieStage===1)return {...s,tieStage:2,paused:false};
      if(s.stage!=='content')return s;
      if(s.game==='football')return gameReducer(s,{type:'next'});
      if(s.game==='hazawi'||s.game==='manners')return {...s,stage:'record',notice:'Time is up. Record the result.'};
      if(s.game==='pearl')return gameReducer(s,{type:'pearl-bank',player:s.players[s.turn]?.id});
      return s;
    }
    case 'goal': { const team=String(a.team); const n=Math.max(0,(s.goals[team]??0)+(a.delta??1)); return {...s,goals:{...s.goals,[team]:n},scores:{...s.scores,[team]:Math.max(0,(s.scores[team]??0)+(a.delta??1))}}; }
    case 'score': { const id=String(a.id); return {...s,scores:{...s.scores,[id]:Math.max(0,(s.scores[id]??0)+a.points)}}; }
    case 'next': {
      const nextTurn=s.turn+1;
      if(s.game==='football'){
        const nextRound=s.round+1;
        if(nextRound>s.rounds)return {...s,stage:s.scores.A===s.scores.B?'tie':'results',completedRounds:s.completedRounds+1};
        return {...s,turn:0,round:nextRound,seconds:s.roundLength*60,completedRounds:s.completedRounds+1,missionIndex:(s.missionIndex+1)%10,cardIndex:s.cardIndex+1};
      }
      if(s.game==='hazawi'||s.game==='manners'){
        if(nextTurn>=s.rounds)return {...s,stage:'results',round:s.rounds};
        return {...s,turn:nextTurn,round:nextTurn+1,seconds:s.roundLength,cardIndex:s.cardIndex+1};
      }
      if(s.game==='pearl'){
        const total=s.players.length*s.rounds;
        if(nextTurn>=total)return {...s,stage:'results'};
        return {...s,turn:nextTurn,round:Math.floor(nextTurn/Math.max(1,s.players.length))+1,seconds:s.roundLength,cardIndex:s.cardIndex+1};
      }
      return {...s,turn:nextTurn,cardIndex:s.cardIndex+1};
    }
    case 'tie': return {...s,stage:'tie',tieStage:a.tieStage??s.tieStage};
    case 'golden-start': return {...s,stage:'tie',tieStage:1,seconds:120,paused:false};
    case 'golden-goal': return {...s,stage:'results',scores:{...s.scores,[a.team]:Math.max(0,s.scores[a.team]??0)+1},notice:`Team ${a.team} wins golden goal.`};
    case 'jump-duel': return {...s,stage:'tie',tieStage:2,seconds:0,paused:false};
    case 'jump-result': return {...s,stage:'results',scores:{...s.scores,[a.team]:Math.max(0,s.scores[a.team]??0)+1},notice:`${a.team} wins Jump Duel · ${a.jumps} jumps`};
    case 'tie-winner': {
      const points=(s.game==='pearl'?(s.banked[a.id]??s.scores[a.id]??0):(s.scores[a.id]??0))+1;
      return {...s,stage:'results',scores:{...s.scores,[a.id]:points},banked:s.game==='pearl'?{...s.banked,[a.id]:points}:s.banked,notice:`${a.name} wins the friendly tie-break.`};
    }
    case 'flip': if(s.flipped.length>=2||s.matched.includes(String(a.id))) return s; return {...s,flipped:[...s.flipped,Number(a.index)]};
    case 'match': { const matched=[...s.matched,String(a.id)]; const scores={...s.scores,[String(a.player)]: (s.scores[String(a.player)]??0)+1}; return {...s,matched,flipped:[],scores,stage:matched.length===8?'results':'content'}; }
    case 'miss': return {...s,flipped:[],turn:(s.turn+1)%Math.max(1,s.players.length)};
    case 'pearl-draw': return {...s,pearlPile:s.pearlPile+a.points,notice:a.label};
    case 'pearl-bust': {const turn=s.turn+1,total=s.players.length*s.rounds;return {...s,pearlPile:0,turn,seconds:30,stage:turn>=total?'results':'content',notice:'Jellyfish! This turn pile is gone.'};}
    case 'pearl-bank': {const id=String(a.player);const turn=s.turn+1,total=s.players.length*s.rounds;return {...s,banked:{...s.banked,[id]:(s.banked[id]??0)+s.pearlPile},pearlPile:0,turn,seconds:30,stage:turn>=total?'results':'content',notice:'Pearls banked safely.'};}
    case 'finish': {
      if(s.resultSaved)return s;
      const allScores=s.game==='pearl'?{...s.banked,...s.scores}:{...s.scores};
      if(s.game==='heritage'||s.game==='pearl'||s.game==='manners'&&s.individualMode){
        const values=Object.values(allScores);const max=Math.max(0,...values);const tied=s.players.filter(p=>(allScores[p.id]??0)===max);
        if(tied.length>1)return {...s,stage:'tie',resultSaved:false,notice:s.game==='heritage'?'Tie · extra 6-card round needed.':s.game==='pearl'?'Tie · one extra dive each; highest single card wins.':'Tie · bonus guest scenario.'};
      }
      if((s.game==='hazawi'||s.game==='manners'&&!s.individualMode)&&(allScores.A??0)===(allScores.B??0))
        return {...s,stage:'tie',resultSaved:false,notice:s.game==='hazawi'?'Tie · sudden-death riddle.':'Tie · bonus guest scenario.'};
      const players=s.players; const teamA=players.filter(p=>p.team==='A').map(p=>p.name).join(' & ')||'Team A'; const teamB=players.filter(p=>p.team==='B').map(p=>p.name).join(' & ')||'Team B';
      const winner=s.game==='football'||s.game==='hazawi'||s.game==='rasm'||((s.game==='manners'||s.game==='head')&&!s.individualMode) ? (allScores.A===allScores.B?'A friendly tie':allScores.A>allScores.B?teamA:teamB) : players.reduce((best,p)=>(allScores[p.id]??0)>(allScores[best?.id??'']??-1)?p:best,players[0])?.name??'Everyone';
      const points=Object.values(allScores).reduce((x,y)=>x+y,0);
      const result={id:`${Date.now()}-${s.results.length}`,game:s.game,title:GAME_CONFIGS.find(g=>g.id===s.game)?.name??s.game,winner,scores:allScores,points,at:new Date().toISOString()};
      const priorPoints=s.results.reduce((sum,r)=>sum+r.points,0);
      return {...s,stage:'results',scores:allScores,results:[result,...s.results],oasis:Math.min(5,Math.floor((priorPoints+points)/5)),resultSaved:true};
    }
    case 'reset': return initialGameDay();
    default:return s;
  }
}
export function loadGameDay(storage: Pick<Storage,'getItem'>): GameDayState {
  try { const raw=storage.getItem(GAME_DAY_KEY); return raw?{...initialGameDay(),...JSON.parse(raw)}:initialGameDay(); } catch { return initialGameDay(); }
}
export function saveGameDay(storage: Pick<Storage,'setItem'>,state:GameDayState){storage.setItem(GAME_DAY_KEY,JSON.stringify(state));}
export function resetGameDay(storage: Pick<Storage,'removeItem'>){storage.removeItem(GAME_DAY_KEY);}
