import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CONFIGS, GAME_DAY_KEY, gameReducer, initialGameDay, loadGameDay, resetGameDay, saveGameDay } from './game-day';

function storage(seed: Record<string,string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem:(key:string)=>values.get(key)??null,
    setItem:(key:string,value:string)=>{values.set(key,value)},
    removeItem:(key:string)=>{values.delete(key)},
    values
  };
}

test('game configs cover the five requested reusable engine games',()=>{
  assert.deepEqual(GAME_CONFIGS.map(g=>g.id),['football','hazawi','heritage','pearl','manners']);
  assert.equal(GAME_CONFIGS[0].mode,'Team');
});
test('game setup defaults, scoring and pauseable timer reduce predictably',()=>{
  let s=gameReducer(initialGameDay(),{type:'game',game:'football'});
  assert.equal(s.stage,'players');assert.equal(s.rounds,2);assert.equal(s.roundLength,3);
  s=gameReducer(s,{type:'ready'});assert.equal(s.seconds,180);
  s=gameReducer(s,{type:'goal',team:'A',delta:2});assert.equal(s.scores.A,2);
  s=gameReducer(s,{type:'pause'});s=gameReducer(s,{type:'tick'});assert.equal(s.seconds,180);
  s=gameReducer(s,{type:'pause'});s=gameReducer(s,{type:'tick'});assert.equal(s.seconds,179);
});
test('a tied two-half football match enters the golden-goal tie stage',()=>{
  let s=gameReducer(initialGameDay(),{type:'game',game:'football'});
  s=gameReducer(s,{type:'goal',team:'A',delta:1});s=gameReducer(s,{type:'goal',team:'B',delta:1});
  s=gameReducer(s,{type:'next'}); // half one ends
  s=gameReducer(s,{type:'next'}); // half two ends
  assert.equal(s.stage,'tie');
  s=gameReducer(s,{type:'jump-result',team:'A',jumps:8});
  assert.equal(s.stage,'results');assert.equal(s.scores.A,2);
});
test('timed football halves advance automatically and golden goals resolve the tie',()=>{
  let s=gameReducer(initialGameDay(),{type:'game',game:'football'});
  s=gameReducer(s,{type:'ready'});
  s=gameReducer({...s,seconds:0},{type:'timer-expired'});
  assert.equal(s.round,2);assert.equal(s.seconds,180);assert.equal(s.completedRounds,1);
  s=gameReducer({...s,seconds:0},{type:'timer-expired'});
  assert.equal(s.stage,'tie');
  s=gameReducer(s,{type:'golden-start'});
  s=gameReducer({...s,seconds:0},{type:'timer-expired'});
  assert.equal(s.tieStage,2);
  s=gameReducer(s,{type:'golden-goal',team:'B'});
  assert.equal(s.stage,'results');assert.equal(s.scores.B,1);
});
test('turn timers lead to host scoring and safely bank an unclaimed pearl pile',()=>{
  for(const game of ['hazawi','manners'] as const){
    let s=gameReducer(initialGameDay(),{type:'game',game});
    s=gameReducer(s,{type:'ready'});
    assert.equal(s.seconds,game==='hazawi'?30:20);
    s=gameReducer({...s,seconds:0},{type:'timer-expired'});
    assert.equal(s.stage,'record');
    assert.match(s.notice,/Time is up/);
  }
  let pearl=gameReducer(initialGameDay(),{type:'game',game:'pearl'});
  pearl=gameReducer(pearl,{type:'ready'});
  pearl=gameReducer({...pearl,seconds:0,pearlPile:3},{type:'timer-expired'});
  assert.equal(pearl.banked.omar,3);
  assert.equal(pearl.turn,1);
});
test('pearl tie-break winner remains ahead when the final score is saved',()=>{
  let s={...initialGameDay(),game:'pearl' as const,stage:'results' as const,banked:{omar:4,jomana:4},scores:{A:0,B:0},resultSaved:false};
  s=gameReducer(s,{type:'finish'});
  assert.equal(s.stage,'tie');
  s=gameReducer(s,{type:'tie-winner',id:'omar',name:'Omar'});
  s=gameReducer(s,{type:'finish'});
  assert.equal(s.stage,'results');
  assert.equal(s.results[0].winner,'Omar');
  assert.equal(s.results[0].scores.omar,5);
});
test('golden goal timer is pauseable and the host can continue to Jump Duel',()=>{
  let s=gameReducer(initialGameDay(),{type:'tie'});
  s=gameReducer(s,{type:'golden-start'});
  assert.equal(s.seconds,120);assert.equal(s.tieStage,1);
  s=gameReducer(s,{type:'pause'});s=gameReducer(s,{type:'tick'});
  assert.equal(s.seconds,120);
  s=gameReducer(s,{type:'pause'});s=gameReducer(s,{type:'tick'});
  assert.equal(s.seconds,119);
  s=gameReducer(s,{type:'jump-duel'});
  assert.equal(s.tieStage,2);assert.equal(s.seconds,0);
});
test('heritage match deterministically awards a pair and keeps the player on turn',()=>{
  let s=gameReducer({...initialGameDay(),game:'heritage',players:[...initialGameDay().players]}, {type:'flip',index:0,id:'dallah'});
  s=gameReducer(s,{type:'flip',index:1,id:'dallah'});
  s=gameReducer(s,{type:'match',id:'dallah',player:'omar'});
  assert.deepEqual(s.matched,['dallah']);assert.equal(s.scores.omar,1);assert.equal(s.turn,0);
  s=gameReducer(s,{type:'miss'});assert.equal(s.turn,1);
});
test('game day saves under an isolated local key and reset leaves wellness records intact',()=>{
  const store=storage({'bayti-family-v3':'wellness','bayti-move-v1':'move'});
  const state={...initialGameDay(),oasis:2};
  saveGameDay(store,state);
  assert.equal(loadGameDay(store).oasis,2);
  resetGameDay(store);
  assert.equal(store.getItem(GAME_DAY_KEY),null);
  assert.equal(store.getItem('bayti-family-v3'),'wellness');
  assert.equal(store.getItem('bayti-move-v1'),'move');
});
test('requested host path saves a tied football win and a heritage round to Scores state',()=>{
  let s=gameReducer(initialGameDay(),{type:'game',game:'football'});
  s=gameReducer(s,{type:'ready'});
  s=gameReducer(s,{type:'goal',team:'A',delta:1});
  s=gameReducer(s,{type:'goal',team:'B',delta:1});
  s=gameReducer(s,{type:'next'});s=gameReducer(s,{type:'next'});
  assert.equal(s.stage,'tie');
  s=gameReducer(s,{type:'jump-result',team:'A',jumps:7});
  s=gameReducer(s,{type:'finish'});
  assert.equal(s.results.length,1);
  assert.equal(s.results[0].winner,'Omar');
  s=gameReducer(s,{type:'game',game:'heritage'});
  s=gameReducer(s,{type:'ready'});
  for(let i=0;i<8;i++){
    const id=`pair-${i}`;
    s=gameReducer(s,{type:'flip',index:i*2,id});
    s=gameReducer(s,{type:'flip',index:i*2+1,id});
    s=gameReducer(s,{type:'match',id,player:'omar'});
  }
  assert.equal(s.stage,'results');
  s=gameReducer(s,{type:'finish'});
  assert.equal(s.results.length,2);
  assert.equal(s.results[0].game,'heritage');
  assert.ok(s.oasis>=1);
});
