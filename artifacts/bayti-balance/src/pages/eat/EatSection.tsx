import { Route, Switch } from 'wouter';
import type { FamilyStore } from '@/hooks/use-family-store';
import { useEatStore } from '@/hooks/use-eat-store';
import { useFamilyWeather } from '@/hooks/use-family-weather';
import { Demo, StorageBanner } from '@/components/shared/kit';
import { EatTabs, type EatCtx } from '@/components/eat/kit';
import { GroceryPage, MealDetailPage, MealsPage } from './MealsPage';
import { PantryPage } from './PantryPage';
import { LeftoversPage } from './LeftoversPage';
import { CookingPage } from './CookingPage';
import { WaterPage } from './WaterPage';
import { LunchboxPage } from './LunchboxPage';
import '@/eat.css';

export default function EatSection({ store }: { store: FamilyStore }) {
  const reading = useFamilyWeather(store.data.weatherOverride);
  const eat = useEatStore(store, reading.mode);
  const ctx: EatCtx = { store, eat, weather: reading.mode, weatherDemo: reading.isDemo, member: store.current };
  const id = store.current.id;
  return <div className="eat">
    <StorageBanner error={eat.storageError} retry={eat.retryStorage} />
    <header className="eat-head">
      <div className="eat-between"><span className="eyebrow">Eat · {store.data.family || 'Your family'}</span>{reading.isDemo && <Demo text={`Demo weather ${reading.temperature}°`} />}</div>
      <h1 className="eat-title">What's <em>cooking</em>, {store.current.name}?</h1>
    </header>
    <EatTabs />
    <Switch>
      <Route path="/eat"><MealsPage ctx={ctx} /></Route>
      <Route path="/eat/meal"><MealDetailPage ctx={ctx} /></Route>
      <Route path="/eat/grocery"><GroceryPage ctx={ctx} /></Route>
      <Route path="/eat/pantry"><PantryPage ctx={ctx} /></Route>
      <Route path="/eat/leftovers"><LeftoversPage ctx={ctx} /></Route>
      <Route path="/eat/cooking"><CookingPage key={id} ctx={ctx} /></Route>
      <Route path="/eat/water"><WaterPage key={id} ctx={ctx} /></Route>
      <Route path="/eat/lunchbox"><LunchboxPage key={id} ctx={ctx} /></Route>
      <Route><MealsPage ctx={ctx} /></Route>
    </Switch>
  </div>;
}
