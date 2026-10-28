import { useEffect } from 'react';
import { Heart, Sparkles, Star } from 'lucide-react';

const STICKERS = [
  { Icon: Star, message: 'Good job!', note: 'Every little move counts.', color: 'gold' },
  { Icon: Heart, message: "You're doing great!", note: 'Keep your own comfortable pace.', color: 'coral' },
  { Icon: Sparkles, message: 'Amazing effort!', note: 'Be proud of your practice.', color: 'mint' },
] as const;

export function ExerciseCelebration({ reps, onDone }: { reps: number; onDone: () => void }) {
  const sticker = STICKERS[(Math.floor(reps / 3) - 1) % STICKERS.length];
  const { Icon } = sticker;

  useEffect(() => {
    const timeout = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(timeout);
  }, [onDone, reps]);

  return <div className="exercise-celebration" role="status" aria-live="polite" aria-atomic="true">
    <div className={`encouragement-sticker sticker-${sticker.color}`}>
      <Star className="sticker-glint sticker-glint-left" size={17} aria-hidden="true"/>
      <Sparkles className="sticker-glint sticker-glint-right" size={22} aria-hidden="true"/>
      <span className="sticker-icon"><Icon size={37} strokeWidth={2} aria-hidden="true"/></span>
      <strong>{sticker.message}</strong>
      <span className="sticker-milestone">{reps} reps completed</span>
      <small>{sticker.note}</small>
    </div>
  </div>;
}
