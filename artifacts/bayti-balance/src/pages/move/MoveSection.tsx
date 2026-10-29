import { Redirect, Route, Switch } from 'wouter';
import type { FamilyStore } from '@/hooks/use-family-store';
import { useMoveStore } from '@/hooks/use-move-store';
import { useFamilyWeather } from '@/hooks/use-family-weather';
import { StorageBanner } from '@/components/shared/kit';
import type { MoveCtx } from '@/components/move/kit';
import MoveLanding from './MoveLanding';
import { OasisSetup, OasisTurn, OasisHandoff } from './OasisPages';
import MirrorMoves from './MirrorMoves';
import SportsPage from './SportsPage';
import { GamesPage } from './GamesPage';
import RabbitQuest from './RabbitQuest';
import StarRope from './StarRope';
import TripPage from './TripPage';
import WeekendPage from './WeekendPage';
import '@/move.css';

export default function MoveSection({ store }: { store: FamilyStore }) {
  const move = useMoveStore(store);
  const weatherReading = useFamilyWeather(store.data.weatherOverride);
  const ctx: MoveCtx = { store, move, weather: weatherReading.mode, member: store.current, weatherDemo: weatherReading.isDemo };
  return <div className="mv">
    <StorageBanner error={move.storageError} retry={move.retryStorage} />
    <Switch>
      <Route path="/move"><MoveLanding ctx={ctx} /></Route>
      <Route path="/move/oasis"><OasisSetup ctx={ctx} /></Route>
      <Route path="/move/oasis-child"><OasisTurn ctx={ctx} role="child" /></Route>
      <Route path="/move/oasis-parent"><OasisTurn ctx={ctx} role="parent" /></Route>
      <Route path="/move/handoff"><OasisHandoff ctx={ctx} /></Route>
      <Route path="/move/mirror"><MirrorMoves ctx={ctx} /></Route>
      <Route path="/move/gym"><Redirect to="/move" /></Route>
      <Route path="/move/exercise"><Redirect to="/move" /></Route>
      <Route path="/move/camera"><Redirect to="/camera-test" /></Route>
      <Route path="/move/walking"><Redirect to="/move" /></Route>
      <Route path="/move/sports"><SportsPage ctx={ctx} /></Route>
      <Route path="/move/games"><GamesPage ctx={ctx} /></Route>
      <Route path="/move/rabbit"><RabbitQuest key={ctx.member.id} ctx={ctx} /></Route>
      <Route path="/move/rope"><StarRope key={ctx.member.id} ctx={ctx} /></Route>
      <Route path="/move/trip"><TripPage ctx={ctx} /></Route>
      <Route path="/move/weekend"><WeekendPage ctx={ctx} /></Route>
      <Route><MoveLanding ctx={ctx} /></Route>
    </Switch>
  </div>;
}
