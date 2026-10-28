import { motion } from 'framer-motion';

const EASE = [0.2, 0.86, 0.28, 1] as const;

function BaytiMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M16 48 50 21l34 27v34H59V62H41v20H16Z" />
      <path className="mark-roof" d="M12 49 50 16l38 33" />
      <path className="mark-orbit" d="M76 21a38 38 0 0 1 6 49" />
      <circle cx="78" cy="74" r="4" />
    </svg>
  );
}

export function Scene5() {
  return (
    <motion.section
      className="film-scene scene-resolve"
      initial={{ opacity: 1, backgroundColor: '#183d49' }}
      animate={{ opacity: 1, backgroundColor: '#fbf7ed' }}
      exit={{ opacity: 0, transition: { duration: 0.24 } }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <div className="end-paper" />
      <motion.div className="end-ribbon ribbon-mint" initial={{ rotate: -14, x: -130, opacity: 0 }} animate={{ rotate: 0, x: 0, opacity: 1 }} transition={{ delay: 0.08, duration: 0.55, ease: EASE }} />
      <motion.div className="end-ribbon ribbon-coral" initial={{ rotate: 16, x: 150, opacity: 0 }} animate={{ rotate: 0, x: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.55, ease: EASE }} />
      <motion.div className="end-ribbon ribbon-sun" initial={{ rotate: 9, y: -100, opacity: 0 }} animate={{ rotate: 0, y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.55, ease: EASE }} />
      <div className="end-words" aria-label="Move. Eat. Recover.">
        <motion.span initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.17, duration: 0.32 }}>MOVE.</motion.span>
        <motion.span initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.39, duration: 0.32 }}>EAT.</motion.span>
        <motion.span initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.61, duration: 0.32 }}>RECOVER.</motion.span>
      </div>
      <motion.div className="brand-lockup" initial={{ opacity: 0, scale: 0.86, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 1.42, duration: 0.7, ease: EASE }}>
        <motion.div
          className="brand-mark-end"
          initial={{ scale: 0.4, rotate: -8 }}
          animate={{ scale: [0.4, 1, 1, 0.9], rotate: [-8, 0, 0, 0], x: [0, 0, 0, '29vw'], y: [0, 0, 0, '-20vh'] }}
          transition={{ delay: 1.48, duration: 4.42, times: [0, 0.12, 0.84, 1], ease: EASE }}
        >
          <BaytiMark />
        </motion.div>
        <div className="brand-name">bayti <b>balance</b></div>
        <div className="brand-rule" />
        <div className="brand-line">A day, held together.</div>
        <div className="brand-subline">Family wellbeing, at your own pace.</div>
      </motion.div>
      <motion.div className="end-sweep" initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 0.75, 0.75, 0] }} transition={{ delay: 2.2, duration: 1.7, times: [0, 0.25, 0.72, 1], ease: 'easeInOut' }} />
      <motion.div
        className="end-pulse"
        animate={{ scale: [0.94, 1.04, 1.04, 0.82], opacity: [0.25, 0.7, 0.42, 0], x: [0, 0, 0, '29vw'], y: [0, 0, 0, '-20vh'] }}
        transition={{ delay: 1.48, duration: 4.42, times: [0, 0.12, 0.84, 1], ease: EASE }}
      />
      <motion.div className="loop-iris" initial={{ scale: 0 }} animate={{ scale: [0, 0, 0, 18] }} transition={{ delay: 5.1, duration: 0.9, times: [0, 0.4, 0.72, 1], ease: EASE }} />
      <div className="scene-index">05 <span>—</span> 05</div>
    </motion.section>
  );
}
