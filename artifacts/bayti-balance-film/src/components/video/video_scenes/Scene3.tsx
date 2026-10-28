import { motion } from 'framer-motion';

const EASE = [0.2, 0.86, 0.28, 1] as const;

export function Scene3() {
  return (
    <motion.section
      className="film-scene scene-eat"
      initial={{ opacity: 1, clipPath: 'inset(0 0 89% 0)' }}
      animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
      exit={{ opacity: 0, clipPath: 'circle(0% at 58% 42%)', scale: 1.04, transition: { duration: 0.55, ease: EASE } }}
    >
      <div className="table-plane" />
      <motion.div className="eat-header" initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.23, duration: 0.5, ease: EASE }}>
        <span className="film-eyebrow">02 — MAKE SPACE AT THE TABLE</span>
        <h2>Eat, without the <em>extra.</em></h2>
      </motion.div>
      <motion.div className="meal-plate" initial={{ scale: 0.55, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ x: '-18vw', y: '-5vh', scale: 1.2, opacity: 1, transition: { duration: 0.55, ease: EASE } }} transition={{ delay: 0.36, duration: 0.9, ease: EASE }}>
        <div className="plate-rim"><div className="plate-well" /></div>
        <motion.div className="food-leaf leaf-a" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 8 }} transition={{ delay: 0.75, type: 'spring', stiffness: 220 }} />
        <motion.div className="food-leaf leaf-b" initial={{ scale: 0, rotate: 30 }} animate={{ scale: 1, rotate: -18 }} transition={{ delay: 0.92, type: 'spring', stiffness: 220 }} />
        <motion.div className="food-disc disc-a" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.08, type: 'spring', stiffness: 250 }} />
        <motion.div className="food-disc disc-b" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.23, type: 'spring', stiffness: 250 }} />
        <motion.div className="food-stem" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 1.34, duration: 0.4 }} />
      </motion.div>
      <motion.div className="meal-question" initial={{ opacity: 0, y: 12, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: -3 }} transition={{ delay: 0.7, duration: 0.45, ease: EASE }}><small>TONIGHT</small><strong>What's<br />cooking?</strong><span>Family meal plan</span></motion.div>
      <motion.div className="food-note note-pantry" initial={{ x: -40, opacity: 0, rotate: -8 }} animate={{ x: 0, opacity: 1, rotate: -4 }} transition={{ delay: 1.65, duration: 0.45, ease: EASE }}><i /><b>Pantry</b><small>Use what you have</small></motion.div>
      <motion.div className="food-note note-leftovers" initial={{ x: 35, opacity: 0, rotate: 7 }} animate={{ x: 0, opacity: 1, rotate: 3 }} transition={{ delay: 2.55, duration: 0.45, ease: EASE }}><i /><b>Leftovers</b><small>Ready for tomorrow</small></motion.div>
      <motion.div className="food-note note-water" initial={{ y: 36, opacity: 0, rotate: -5 }} animate={{ y: 0, opacity: 1, rotate: -2 }} transition={{ delay: 3.3, duration: 0.45, ease: EASE }}><i /><b>Water</b><small>A simple reminder</small></motion.div>
      <motion.div className="eat-caption" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.8, duration: 0.4 }}>A little planning. More room at the table.</motion.div>
      <motion.div className="plate-moon" animate={{ rotate: 360 }} exit={{ x: '-18vw', y: '-5vh', scale: 1.2, opacity: 1, transition: { duration: 0.55, ease: EASE } }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}><span /></motion.div>
      <div className="scene-index">03 <span>—</span> 05</div>
    </motion.section>
  );
}
