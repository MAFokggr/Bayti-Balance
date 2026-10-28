import { motion } from 'framer-motion';

const EASE = [0.2, 0.86, 0.28, 1] as const;

export function Scene2() {
  return (
    <motion.section
      className="film-scene scene-move"
      initial={{ opacity: 0.4, scale: 1.12, rotate: -1.2 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 1.08, rotate: 1, filter: 'blur(6px)', transition: { duration: 0.4 } }}
    >
      <div className="move-sky" />
      <div className="move-sun"><span /></div>
      <svg className="move-hills" viewBox="0 0 1600 700" preserveAspectRatio="none" aria-hidden="true">
        <path className="hill-back" d="M0 290 Q220 110 430 263T840 228Q1100 70 1320 220T1600 183V700H0Z" />
        <path className="hill-front" d="M0 420Q160 315 365 410T735 372Q1000 260 1220 410T1600 346V700H0Z" />
        <path className="hill-foreground" d="M0 530Q270 426 510 540T1030 500Q1310 410 1600 510V700H0Z" />
      </svg>
      <svg className="move-route" viewBox="0 0 1600 700" preserveAspectRatio="none" aria-hidden="true">
        <motion.path d="M-60 550 C180 505 220 360 445 425 S730 564 900 448 S1190 280 1690 352" pathLength="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.25, ease: EASE }} />
        <motion.circle cx="445" cy="425" r="13" initial={{ scale: 0 }} animate={{ scale: [0, 1.35, 1] }} transition={{ delay: 0.68, duration: 0.45 }} />
        <motion.circle cx="900" cy="448" r="13" initial={{ scale: 0 }} animate={{ scale: [0, 1.35, 1] }} transition={{ delay: 1.03, duration: 0.45 }} />
      </svg>
      <motion.div className="move-title" initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
        <span className="film-eyebrow">01 — FIND YOUR PACE</span>
        <h2>Move, <em>your way.</em></h2>
      </motion.div>
      <motion.div className="move-session" initial={{ opacity: 0, x: -42, rotate: -4 }} animate={{ opacity: 1, x: 0, rotate: -2 }} transition={{ delay: 0.75, duration: 0.65, ease: EASE }}>
        <div className="session-label">TODAY'S LITTLE ADVENTURE</div>
        <strong>Build the<br />oasis.</strong>
        <div className="session-meta"><span className="session-avatars"><i /><i /></span><span>Parent + child</span></div>
        <div className="session-bottom"><span>Small moves count.</span><span className="mini-sun" aria-hidden="true" /></div>
      </motion.div>
      <motion.div className="oasis-palm palm-one" initial={{ y: 40, opacity: 0 }} animate={{ y: [0, -4, 0], opacity: 1 }} transition={{ delay: 0.9, duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
        <i /><b /><span />
      </motion.div>
      <motion.div className="oasis-palm palm-two" initial={{ y: 35, opacity: 0 }} animate={{ y: [0, -5, 0], opacity: 1 }} transition={{ delay: 1.2, duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
        <i /><b /><span />
      </motion.div>
      <motion.div className="walker walker-a" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: [0, -5, 0] }} transition={{ delay: 0.65, duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}><i /><b /><span /></motion.div>
      <motion.div className="walker walker-b" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: [0, -5, 0] }} transition={{ delay: 0.88, duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}><i /><b /><span /></motion.div>
      <motion.div className="move-weather" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.2, duration: 0.35 }}>INDOOR / OUTDOOR<br /><b>OPTIONS</b></motion.div>
      <motion.div
        className="route-lens"
        initial={{ opacity: 0, scale: 0.55 }}
        animate={{ opacity: [0, 0.95, 1], scale: [0.55, 1, 4.35], x: [0, 0, '-13vw'], y: [0, 0, '5vh'] }}
        transition={{ delay: 2.75, duration: 1.25, times: [0, 0.2, 1], ease: EASE }}
      />
      <motion.div className="route-carrier" animate={{ x: ['0vw', '38vw', '82vw'], y: ['0vh', '-14vh', '-23vh'] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
      <div className="scene-index">02 <span>—</span> 05</div>
    </motion.section>
  );
}
