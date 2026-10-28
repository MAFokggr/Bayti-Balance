import { motion } from 'framer-motion';

const EASE = [0.2, 0.86, 0.28, 1] as const;

export function Scene4() {
  return (
    <motion.section
      className="film-scene scene-recover"
      initial={{ opacity: 1, clipPath: 'inset(0 0 0 89%)' }}
      animate={{ opacity: 1, clipPath: 'inset(0 0 0 0%)' }}
      exit={{ opacity: 0, scale: 1.09, filter: 'blur(9px)', transition: { duration: 0.4, ease: EASE } }}
    >
      <div className="night-noise" aria-hidden="true" />
      <div className="night-star star-one" />
      <div className="night-star star-two" />
      <div className="night-star star-three" />
      <motion.div className="recovery-copy" initial={{ opacity: 0, x: -25 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
        <span className="film-eyebrow">03 — END THE DAY GENTLY</span>
        <h2>
          <motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4, ease: EASE }}>Rest is part</motion.span>
          <motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.4, ease: EASE }}>of the <em>plan.</em></motion.span>
        </h2>
      </motion.div>
      <motion.div className="sleep-dial" initial={{ scale: 0.6, rotate: -24, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ x: '-8vw', y: '-5vh', scale: 2.05, opacity: 0, transition: { duration: 0.5, ease: EASE } }} transition={{ delay: 0.28, duration: 0.85, ease: EASE }}>
        <div className="dial-ticks">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 22.5}deg)` }} />)}</div>
        <div className="dial-moon"><span /></div>
        <div className="dial-caption">LAST NIGHT'S SLEEP</div>
        <div className="dial-hours">8<small>:15</small></div>
        <div className="dial-note">saved preference</div>
      </motion.div>
      <div className="winddown-list">
        <motion.div className="winddown-item" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6, duration: 0.45 }}><span className="check-star">✓</span><b>Dim the lights</b></motion.div>
        <motion.div className="winddown-item" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.3, duration: 0.45 }}><span className="check-star">✓</span><b>Settle in</b></motion.div>
        <motion.div className="winddown-item" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 3.0, duration: 0.45 }}><span className="check-star">✓</span><b>Easy breaths</b></motion.div>
      </div>
      <motion.div className="recovery-caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.6, duration: 0.4 }}>A preference, not a diagnosis.</motion.div>
      <motion.div className="breath-ring" animate={{ scale: [0.88, 1.04, 0.88], opacity: [0.35, 0.75, 0.35] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="roofline-carrier" exit={{ x: '-42vw', y: '-58vh', scale: 2.3, opacity: 1, transition: { duration: 0.5, ease: EASE } }}>
        <svg viewBox="0 0 140 70" aria-hidden="true"><path d="M8 37 70 8l62 29M24 35v28h92V35" /></svg>
      </motion.div>
      <div className="scene-index">04 <span>—</span> 05</div>
    </motion.section>
  );
}
