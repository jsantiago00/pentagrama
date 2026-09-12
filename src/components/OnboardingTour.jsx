import { useEffect, useRef, useState } from 'react';
import { TOUR_STEPS } from '../lib/tourSteps';

export default function OnboardingTour({ stepIndex, onNext, onSkip }) {
  const step = TOUR_STEPS[stepIndex];
  const [rect, setRect] = useState(null);
  const tooltipRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    function measure() {
      const el = document.querySelector(step.target);
      setRect(el ? el.getBoundingClientRect() : null);
    }
    measure();
    // Un par de remedidas extra: los modales entran con una animación
    // (~200ms) y algunos targets tardan un tick en montarse.
    const timers = [50, 260].map(ms => setTimeout(measure, ms));
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step.target]);

  useEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const pad = 14;
    const tw = el.offsetWidth, th = el.offsetHeight;
    let top, left;
    if (rect) {
      const spaceBelow = window.innerHeight - (rect.top + rect.height);
      const spaceAbove = rect.top;
      top = spaceBelow >= th + pad || spaceBelow >= spaceAbove
        ? rect.top + rect.height + pad
        : rect.top - th - pad;
      left = rect.left + rect.width / 2 - tw / 2;
    } else {
      top = window.innerHeight / 2 - th / 2;
      left = window.innerWidth / 2 - tw / 2;
    }
    top = Math.min(Math.max(top, pad), window.innerHeight - th - pad);
    left = Math.min(Math.max(left, pad), window.innerWidth - tw - pad);
    setPos({ top, left });
  }, [rect, step]);

  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div className={`tour-overlay${rect ? '' : ' no-target'}`}>
      {rect && (
        <div
          className="tour-spotlight"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div className="tour-tooltip" ref={tooltipRef} style={pos ? { top: pos.top, left: pos.left } : { opacity: 0 }}>
        <div className="tour-tooltip-head">
          <span className="tour-step-count">Paso {stepIndex + 1} de {TOUR_STEPS.length}</span>
          <button className="tour-skip" onClick={onSkip}>Saltear tutorial</button>
        </div>
        <div className="tour-title">{step.title}</div>
        <div className="tour-text">{step.text}</div>
        {step.example && <div className="tour-example">“{step.example}”</div>}
        <div className="tour-footer">
          <div className="tour-dots">
            {TOUR_STEPS.map((s, i) => <span key={s.id} className={`tour-dot${i === stepIndex ? ' active' : ''}`} />)}
          </div>
          <button className="btn-small primary" onClick={onNext}>{isLast ? '¡Listo! 🎸' : 'Siguiente →'}</button>
        </div>
      </div>
    </div>
  );
}
