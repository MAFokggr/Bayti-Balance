import { Armchair, CircleDot, Coffee, Droplets, Dumbbell, Footprints, Landmark, MapPin, Salad, Shapes, Ship, TreePalm, Trees, Umbrella, Volleyball, Waves, Utensils, Building2, type LucideIcon } from 'lucide-react';

export const STOP_ICONS: Record<string, LucideIcon> = { TreePalm, Trees, Waves, Ship, Umbrella, Footprints, Volleyball, Dumbbell, CircleDot, Salad, Landmark, Shapes, Droplets, Armchair, Coffee, Utensils, Building2 };
const KIND: Record<string, LucideIcon> = { water: Droplets, rest: Armchair, meal: Salad, walk: Footprints, alternative: Building2 };
export function stopIcon(illustration?: string, kind?: string): LucideIcon {
  return (illustration && STOP_ICONS[illustration]) || (kind && KIND[kind]) || MapPin;
}
export const STOP_COLORS = ['#78D5C5', '#F59B7A', '#F6D477', '#A9D9B8', '#CDBBEA', '#E9C98B'];
