import { ACTIVITY_STOPS } from './move-stops';
import type { WeatherMode } from './family-types';
import type { ActivityStop, TripChange, TripPlan, TripPreferences, TripStop } from './move-types';

function allowed(stop: ActivityStop, preferences: TripPreferences, weather: WeatherMode) {
  if (preferences.accessible && !stop.accessible) return false;
  if (preferences.location === 'indoor' && !stop.indoor) return false;
  // Dust does not necessarily clear at sunset.
  if (weather === 'dusty' && !stop.indoor) return false;
  if (weather === 'highHeat' && preferences.timeOfDay !== 'sunset' && !stop.indoor) return false;
  return true;
}
const asStop = (stop: ActivityStop, kind: TripStop['kind'], optional = false): TripStop => ({ ...stop, kind, optional });
const isWalk = (stop: ActivityStop) => ['corniche', 'track', 'culture', 'park', 'beach'].includes(stop.id);
function breakStop(anchor: ActivityStop, kind: 'water' | 'rest'): TripStop {
  return {
    ...anchor, id: `${kind}-${crypto.randomUUID()}`, name: kind === 'water' ? 'Water break — bring your own water' : 'Rest break — choose a suitable seat',
    kind, minutes: 5, cost: 0, interests: [], illustration: kind === 'water' ? 'Droplets' : 'Armchair',
    description: 'A planned break, not a verified drinking fountain or booked facility. Check access on arrival.',
  };
}

function balance(plan: TripPlan, preferences: TripPreferences): TripPlan {
  const stops = plan.stops.map((stop) => ({ ...stop }));
  let cost = stops.filter((stop) => !stop.optional).reduce((sum, stop) => sum + stop.cost, 0);
  const explanations = [...plan.explanations];
  if (cost > preferences.budget) {
    const meal = stops.find((stop) => stop.kind === 'meal' && !stop.optional);
    if (meal) {
      meal.optional = true;
      cost -= meal.cost;
      explanations.push('The cafe became optional to fit your budget; bring a suitable packed meal if you skip it.');
    }
  }
  if (cost > preferences.budget) throw new Error('These stops exceed your budget. Choose a cheaper stop, remove a paid stop, or increase the budget.');
  let minutes = stops.filter((stop) => !stop.optional).reduce((sum, stop) => sum + stop.minutes, 0);
  if (minutes > preferences.minutes) {
    for (const stop of stops.filter((stop) => !stop.optional)) {
      const minimum = stop.kind === 'meal' ? 10 : 5;
      const reduceBy = Math.min(Math.max(0, stop.minutes - minimum), minutes - preferences.minutes);
      stop.minutes -= reduceBy;
      minutes -= reduceBy;
      if (minutes <= preferences.minutes) break;
    }
    if (minutes > preferences.minutes) throw new Error('There is not enough time for all these stops. Remove a stop or allow more time.');
    explanations.push('Stop durations were shortened to fit your available time; travel time is not included.');
  }
  return { ...plan, stops, cost, minutes, explanations };
}

export function generateTrip(preferences: TripPreferences, weather: WeatherMode): TripPlan {
  if (!Number.isFinite(preferences.budget) || preferences.budget < 0 || !Number.isFinite(preferences.minutes) || preferences.minutes < 20) {
    throw new Error('Choose a non-negative budget and at least 20 minutes.');
  }
  const candidates = ACTIVITY_STOPS.filter((stop) => allowed(stop, preferences, weather) && stop.cost <= preferences.budget);
  const preferred = preferences.location === 'outdoor' ? candidates.filter((stop) => !stop.indoor) : candidates;
  const pool = preferred.length ? preferred : candidates;
  const activityPool = pool.filter((stop) => stop.id !== 'healthy-cafe');
  const ranked = (activityPool.length ? activityPool : pool).slice().sort((a, b) => {
    const score = (stop: ActivityStop) => stop.interests.filter((interest) => preferences.interests.includes(interest)).length * 10 - stop.cost / 20;
    return score(b) - score(a);
  });
  const primary = ranked[0];
  if (!primary) throw new Error('No suitable stop fits those choices. Try a higher budget, another location preference, or different weather/time.');
  const cafe = ACTIVITY_STOPS.find((stop) => stop.id === 'healthy-cafe')!;
  const alternative = ACTIVITY_STOPS.find((stop) => stop.indoor && stop.id !== primary.id && stop.id !== cafe.id)!;
  const explanations = ['This Demo itinerary uses rule-based suggestions and approximate zones, prices and durations; confirm them with venues.'];
  if (weather === 'dusty') explanations.push('Outdoor activities were changed to indoor stops because dusty conditions are selected.');
  if (weather === 'highHeat') explanations.push(preferences.timeOfDay === 'sunset'
    ? 'Outdoor time is planned after sunset because high heat is selected; check actual conditions and use the indoor alternative if it is still too hot.'
    : 'Outdoor activities were changed to indoor stops because Abu Dhabi is too hot at the selected time.');
  if (preferences.accessible) explanations.push('Stops marked as potentially accessible were selected; confirm step-free access and facilities directly.');
  return balance({
    id: crypto.randomUUID(), createdAt: new Date().toISOString(), weather, timeOfDay: preferences.timeOfDay,
    stops: [
      asStop(primary, isWalk(primary) ? 'walk' : primary.id === 'healthy-cafe' ? 'meal' : 'activity'),
      ...(primary.id === cafe.id ? [] : [asStop(cafe, 'meal')]),
      breakStop(primary, 'water'), breakStop(primary, 'rest'), asStop(alternative, 'alternative', true),
    ], cost: 0, minutes: 0, explanations,
  }, preferences);
}

export function changeTrip(plan: TripPlan, change: TripChange, preferences: TripPreferences, weather: WeatherMode, stopId?: string): TripPlan {
  const unsafe = weather === 'dusty' || (weather === 'highHeat' && preferences.timeOfDay !== 'sunset');
  if (change !== 'indoor' && unsafe && plan.stops.some((stop) => !stop.indoor)) {
    const indoorPlan = changeTrip(plan, 'indoor', { ...preferences, location: 'indoor' }, weather);
    return changeTrip(indoorPlan, change, { ...preferences, location: 'indoor' }, weather, stopId);
  }
  let stops = plan.stops.map((stop) => ({ ...stop }));
  let reason = '';
  const primary = stops.find((stop) => stop.kind === 'walk' || stop.kind === 'activity') ?? stops[0];
  if (!primary) throw new Error('Build a route before changing it.');
  if (change === 'add') {
    const stop = ACTIVITY_STOPS.find((item) => item.id === stopId);
    if (!stop) throw new Error('Choose a stop to add.');
    if (!allowed(stop, preferences, weather)) throw new Error('That stop does not fit the selected weather or accessibility choices. Change those choices or choose an indoor alternative.');
    if (stops.some((item) => item.id === stop.id && !item.optional)) throw new Error('That stop is already on your route.');
    stops = stops.filter((item) => item.id !== stop.id);
    stops.push(asStop(stop, isWalk(stop) ? 'walk' : stop.id === 'healthy-cafe' ? 'meal' : 'activity'));
    reason = `${stop.name} was added to match your family’s interests.`;
  } else if (change === 'remove') {
    const removed = stops.find((stop) => stop.id === stopId);
    if (!removed) throw new Error('Choose a stop to remove.');
    stops = stops.filter((stop) => stop.id !== stopId);
    if (!stops.some((stop) => !stop.optional)) throw new Error('Keep at least one active stop in your itinerary.');
    reason = `${removed.name} was removed from your route.`;
  } else if (change === 'water' || change === 'rest') {
    stops.push(breakStop(primary, change));
    reason = change === 'water' ? 'An extra water break was added so the family can pause and drink if appropriate.' : 'An extra rest stop was added to give the family more time to recover.';
  } else if (change === 'less-walking') {
    stops = stops.map((stop) => stop.kind === 'walk' ? { ...stop, minutes: Math.max(5, Math.round(stop.minutes * .6)) } : stop);
    reason = stops.some((stop) => stop.kind === 'walk') ? 'Walking durations were reduced to make the route gentler.' : 'There are no walking segments to shorten; the current indoor activity can be done at a gentle pace.';
  } else if (change === 'cheaper') {
    const cheaper = ACTIVITY_STOPS.filter((stop) => stop.id !== primary.id && stop.cost < primary.cost && allowed(stop, preferences, weather))
      .sort((a, b) => a.cost - b.cost)[0];
    if (cheaper) {
      stops = stops.map((stop) => stop.id === primary.id ? asStop(cheaper, isWalk(cheaper) ? 'walk' : 'activity') : stop);
      reason = `${primary.name} was replaced with ${cheaper.name} to lower the estimated cost.`;
    } else {
      const meal = stops.find((stop) => stop.kind === 'meal' && !stop.optional);
      if (meal) { meal.optional = true; reason = 'The cafe is now optional to reduce cost; bring a suitable packed meal if you skip it.'; }
      else reason = 'The route is already using its lowest-cost choices; optional stops are not included in the total.';
    }
  } else if (change === 'indoor') {
    const indoors = ACTIVITY_STOPS.filter((stop) => stop.indoor && (!preferences.accessible || stop.accessible) && stop.cost <= preferences.budget);
    const activities = indoors.filter((stop) => stop.id !== 'healthy-cafe');
    const indoor = (activities.length ? activities : indoors).sort((a, b) => a.cost - b.cost)[0];
    if (!indoor) throw new Error('No indoor stop fits this budget. Increase the budget or remove a paid stop first.');
    const anchor = { ...indoor };
    stops = stops.map((stop) => {
      if (stop.indoor) return stop;
      if (stop.kind === 'water' || stop.kind === 'rest') return { ...stop, lat: anchor.lat, lng: anchor.lng, indoor: true, heatSuitable: true };
      return { ...asStop(anchor, stop.kind === 'alternative' ? 'alternative' : 'activity', stop.optional), id: stop.id, name: `${indoor.name} (indoor replacement)` };
    });
    reason = 'Outdoor stops were replaced with indoor options because the family chose to stay indoors.';
  }
  return balance({ ...plan, weather, stops, explanations: [...plan.explanations, reason] }, preferences);
}

export function weekendPlan(plan: TripPlan) {
  const active = plan.stops.find((stop) => stop.kind === 'walk' || stop.kind === 'activity');
  return [
    { day: 'Friday', title: 'Sunset family walk', description: plan.weather === 'dusty' ? 'Indoor walking during dusty conditions.' : 'A short walk after sunset, only if local conditions are comfortable.' },
    { day: 'Friday', title: 'Family dinner', description: 'A shared meal with individual portions and allergy checks.' },
    { day: 'Saturday', title: 'Family activity', description: active?.name ?? 'Choose an activity together.' },
    { day: 'Saturday', title: 'Water break', description: 'Bring your own water and take a comfortable pause.' },
    { day: 'Saturday', title: 'Indoor sports', description: 'An age-appropriate, supervised indoor option.' },
    { day: 'Saturday', title: 'Healthy restaurant', description: 'Check menus, prices, allergies and access; no booking is made.' },
    { day: 'Saturday', title: 'Evening recovery', description: 'Gentle stretches and a quiet, screen-free wind-down.' },
  ];
}
