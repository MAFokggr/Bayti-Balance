import { motion } from 'framer-motion';

const EASE = [0.2, 0.86, 0.28, 1] as const;

export function Scene1() {
  return (
    <motion.section
      className="film-scene scene-open"
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.055, filter: 'blur(8px)', transition: { duration: 0.42, ease: EASE } }}
    >
      <div className="open-rule" />
      <motion.div className="home-stamp" initial={{ scale: 0.5, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 285, damping: 17 }}>
        <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M14 48 50 18l36 30v37H59V62H41v23H14Z" /><path d="M9 48 50 13l41 35" /></svg>
        <i />
      </motion.div>
      <div className="open-copy">
        <motion.p className="film-eyebrow" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.16 }}>A FAMILY WELLBEING COMPANION</motion.p>
        <motion.h1 aria-label="A little balance.">
          <motion.span initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.56, delay: 0.2, ease: EASE }}>A little</motion.span>
          <motion.span initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.56, delay: 0.55, ease: EASE }}><em>balance.</em></motion.span>
        </motion.h1>
        <motion.div className="copy-underline" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.45, delay: 0.8, ease: EASE }} />
      </div>
      <motion.div className="daily-board" initial={{ opacity: 0, scale: 0.78, rotate: 6, x: 18 }} animate={{ opacity: 1, scale: 1, rotate: 1.5, x: 0 }} transition={{ duration: 0.8, delay: 0.48, ease: EASE }}>
        <div className="board-head"><span>Today, together</span><small>YOUR FAMILY</small></div>
        <div className="board-tiles">
          <motion.div className="board-tile tile-move" initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7, type: 'spring', stiffness: 300, damping: 18 }}><b>01</b><span>Move</span><i className="tile-icon move-glyph" /></motion.div>
          <motion.div className="board-tile tile-eat" initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 18 }}><b>02</b><span>Eat</span><i className="tile-icon eat-glyph" /></motion.div>
          <motion.div className="board-tile tile-rest" initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.1, type: 'spring', stiffness: 300, damping: 18 }}><b>03</b><span>Recover</span><i className="tile-icon rest-glyph" /></motion.div>
        </div>
        <div className="board-foot"><span className="board-dot" /><span>One small thing at a time</span><span className="board-count">03 / 03</span></div>
      </motion.div>
      <motion.div className="orbit-line" animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}><i /></motion.div>
      <motion.div
        className="carrier-ring"
        initial={{ scale: 0.45, opacity: 0 }}
        animate={{ scale: [0.45, 1, 1, 2.5, 1], opacity: [0, 0.9, 0.9, 1, 1], x: [0, 0, 0, '-50vw', '-82vw'], y: [0, 0, 0, '-10vh', 0] }}
        transition={{ delay: 0.9, duration: 3.1, times: [0, 0.2, 0.61, 0.82, 1], ease: EASE }}
      />
      <div className="scene-index">01 <span>—</span> 05</div>
    </motion.section>
  );
}
