import type { ActivityStop, TripPreferences } from './move-types';

export const DEFAULT_TRIP_PREFERENCES: TripPreferences = {
  budget: 150, interests: ['nature', 'food'], location: 'any', accessible: true, minutes: 120, timeOfDay: 'sunset',
};
// Illustrative planning zones, not verified entrances, prices or accessibility guarantees.
type Seed = [string, string, number, number, number, number, boolean, boolean, ActivityStop['interests'], string, string];
const SEEDS: Seed[] = [
  ['corniche', 'Corniche walk', 24.475, 54.345, 30, 0, false, true, ['nature'], 'TreePalm', 'A gentle waterfront walk; confirm the exact accessible entrance.'],
  ['park', 'Umm Al Emarat Park', 24.454, 54.385, 40, 10, false, true, ['nature', 'play'], 'Trees', 'A family park stop; check current opening hours and admission.'],
  ['mangroves', 'Mangrove kayaking', 24.455, 54.429, 60, 120, false, false, ['nature', 'sport'], 'Waves', 'A guided, age-appropriate session with suitable safety equipment.'],
  ['boat', 'Family boat outing', 24.53, 54.38, 60, 100, false, false, ['nature'], 'Ship', 'Check operator safety, age rules, weather and life jackets.'],
  ['beach', 'Family beach area', 24.463, 54.329, 40, 10, false, true, ['nature', 'play'], 'Umbrella', 'Check flags, supervision, access and current weather.'],
  ['track', 'Community walking track', 24.428, 54.415, 25, 0, false, true, ['sport', 'nature'], 'Footprints', 'A short, level practice route; this is an approximate planning zone.'],
  ['sports-club', 'Indoor sports club', 24.447, 54.376, 45, 40, true, true, ['sport', 'play'], 'Volleyball', 'Confirm family sessions, accessibility and entry charges with the venue.'],
  ['family-gym', 'Family gym session', 24.456, 54.383, 35, 35, true, true, ['sport'], 'Dumbbell', 'Choose supervised, age-appropriate activities and confirm access.'],
  ['paddle-venue', 'Indoor paddle venue', 24.445, 54.392, 45, 70, true, true, ['sport'], 'CircleDot', 'An illustrative indoor racket-sport stop; reserve a suitable court.'],
  ['healthy-cafe', 'Healthy cafe stop', 24.471, 54.361, 25, 25, true, true, ['food'], 'Salad', 'Check menu, allergies, current prices and halal requirements directly.'],
  ['culture', 'Cultural walking area', 24.533, 54.398, 30, 0, false, true, ['culture', 'nature'], 'Landmark', 'An outdoor cultural-area stroll; museum admission is not included.'],
  ['indoor-play', 'Indoor play area', 24.483, 54.363, 40, 45, true, true, ['play'], 'Shapes', 'Confirm age limits, adult supervision and accessible facilities.'],
];
export const ACTIVITY_STOPS: ActivityStop[] = SEEDS.map(([id, name, lat, lng, minutes, cost, indoor, accessible, interests, illustration, description]) => ({
  id, name, lat, lng, minutes, cost, indoor, accessible, interests, illustration, description,
  distanceKm: Math.round(Math.hypot((lat - 24.45) * 111, (lng - 54.37) * 101) * 10) / 10,
  heatSuitable: indoor, familySuitability: id === 'mangroves' || id === 'boat' ? 'Age and ability restrictions; check with the operator.' : 'Family option; confirm age, supervision and access requirements.',
}));
