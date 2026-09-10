'use client';

import { useEffect, useRef } from 'react';

import {
  ACTIVITY_MS,
  BALL_SIZE,
  MAX_PARTICLES,
  scaleEffects,
  scaleRamp,
  type ScaleAnimation
} from '@/lib/field-animation';

/**
 * La couche de dessin des trois styles à bille.
 *
 * **Elle ne dessine que pendant qu'on répond.** Une flamme, un arc et une onde
 * coûtent une image par rafraîchissement ; les laisser tourner sur une note
 * posée depuis dix minutes reviendrait à faire chauffer un téléphone pour
 * décorer une réponse déjà donnée. La fenêtre s'ouvre à chaque cran franchi,
 * dure {@link ACTIVITY_MS} millisecondes, puis se referme d'elle-même — la
 * couleur, elle, reste, parce qu'elle porte la réponse.
 *
 * Elle est purement décorative : aucune donnée n'en sort, rien n'y est
 * cliquable, et l'accessibilité ne la voit pas. Le vrai contrôle est le
 * `input[type=range]` natif qui vit au-dessus.
 */

/**
 * La toile déborde au-dessus du rail : c'est là que montent flammes et arcs.
 *
 * Elle se cale sur la LIGNE DU RAIL, pas sur le haut du conteneur. Le parent la
 * monte dans une ancre de hauteur nulle posée au centre du rail, et la toile
 * remonte de {@link RAIL_Y} : le cadrage reste juste quelle que soit la hauteur
 * du conteneur, qui change avec le style choisi.
 */
const CANVAS_HEIGHT = 60;
/** La ligne du rail, dans le repère de la toile. */
const RAIL_Y = 56;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

/** Le signal d'un cran franchi. Son `id` change à chaque saisie. */
export interface ScalePulse {
  id: number;
  /** +1 vers le haut, −1 vers le bas. */
  direction: number;
  /** La distance franchie d'un coup, en pixels. */
  travel: number;
  /** Vrai quand la note vient d'atteindre le sommet. */
  burst: boolean;
}

interface Props {
  animation: ScaleAnimation;
  /** La part remplie, entre 0 et 1. */
  ratio: number;
  /** La largeur du conteneur, en pixels. */
  width: number;
  pulse: ScalePulse | null;
}

export function ScaleEffects({ animation, ratio, width, pulse }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);
  const until = useRef(0);
  const last = useRef(0);
  const emitted = useRef(0);
  const particles = useRef<Particle[]>([]);
  const motion = useRef({ direction: 1, travel: 0 });
  /**
   * Le déclencheur, publié par la boucle et appelé par les crans.
   *
   * Les deux effets sont séparés exprès. Monter la boucle et l'ouvrir à chaque
   * cran dans un seul effet le ferait démonter puis remonter à chaque
   * mouvement du doigt : le nettoyage éteindrait les braises en vol, et une
   * traversée du rail ne laisserait qu'une suite de traînées coupées.
   */
  const open = useRef<((signal: ScalePulse) => void) | null>(null);

  /**
   * Les valeurs courantes, lisibles depuis la boucle sans la relancer.
   *
   * Cet effet est declare EN PREMIER, et c'est ce qui le rend correct : React
   * les joue dans l'ordre ou ils sont ecrits, donc la boucle et le declencheur
   * qui suivent lisent deja la note du rendu en cours. Ecrit pendant le rendu,
   * il aurait fait la meme chose au prix d'une regle de React enfreinte.
   */
  const live = useRef({ animation, ratio, width });
  useEffect(() => {
    live.current = { animation, ratio, width };
  });

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext('2d');
    if (!context) return;

    const density = Math.min(window.devicePixelRatio || 1, 2);

    function stop() {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      last.current = 0;
      particles.current = [];
      context!.clearRect(0, 0, live.current.width, CANVAS_HEIGHT);
    }

    function emit(count: number) {
      const head =
        BALL_SIZE / 2 + live.current.ratio * Math.max(0, live.current.width - BALL_SIZE);
      for (let i = 0; i < count && particles.current.length < MAX_PARTICLES; i += 1) {
        particles.current.push({
          x: head + (Math.random() - 0.5) * 10,
          y: RAIL_Y - 2,
          vx: (Math.random() - 0.5) * 25,
          vy: -25 - Math.random() * 35,
          life: 0.4 + Math.random() * 0.4
        });
      }
    }

    function tick(now: number) {
      frame.current = 0;
      if (document.hidden || !canvas.current) {
        stop();
        return;
      }

      const style = live.current.animation;
      const part = live.current.ratio;
      const full = live.current.width;

      const step = Math.min((now - (last.current || now)) / 1000, 0.032);
      last.current = now;

      const moving = now < until.current;
      const decay = Math.max(0, (until.current - now) / ACTIVITY_MS);
      const track = Math.max(0, full - BALL_SIZE);
      const start = BALL_SIZE / 2;
      const head = start + part * track;
      const ramp = scaleRamp(style);
      const effects = scaleEffects(style, part);

      context!.clearRect(0, 0, full, CANVAS_HEIGHT);

      if (moving && effects.particles && now - emitted.current > 90) {
        emit(2);
        emitted.current = now;
      }

      // Roue de feu : le feu leche la tete de jauge, il ne borde pas le rail.
      //
      // Dessine sur toute la longueur remplie et a hauteur constante, il
      // donnait une palissade de triangles identiques posee sur la partie
      // froide — un motif, pas une flamme. Il ne prend donc que la portion
      // chaude, s'eteint vers la queue, et ses pointes portent deux
      // frequences pour qu'aucune ne ressemble a sa voisine.
      if (moving && effects.flame) {
        const reach = Math.min(head - start, 170);
        const base = RAIL_Y - 3;

        const blaze = context!.createLinearGradient(0, base - 20, 0, base);
        blaze.addColorStop(0, ramp(1));
        blaze.addColorStop(1, ramp(part));

        context!.fillStyle = blaze;
        context!.globalAlpha = 0.92 * decay;
        context!.beginPath();
        context!.moveTo(head - reach, base);
        for (let x = head - reach; x <= head; x += 2) {
          // Zero a la queue, un a la tete : la flamme nait de la chaleur, donc
          // de la ou la jauge est chaude.
          const along = reach > 0 ? (x - (head - reach)) / reach : 1;
          const strength = along * along;
          const tongue =
            Math.pow(Math.sin(x * 0.13 + now * 0.009), 6) * 12 +
            Math.pow(Math.sin(x * 0.29 - now * 0.013), 4) * 6;
          context!.lineTo(x, base - tongue * strength);
        }
        context!.lineTo(head, base);
        context!.closePath();
        context!.fill();
        context!.globalAlpha = 1;
      }

      // Orbe : trainee, halo, arcs.
      if (moving && style === 'energy') {
        const tail = Math.max(
          start,
          Math.min(start + track, head - motion.current.direction * 35 * decay)
        );
        context!.strokeStyle = ramp(part);
        context!.globalAlpha = decay * 0.4;
        context!.lineWidth = 6;
        context!.lineCap = 'round';
        context!.beginPath();
        context!.moveTo(head, RAIL_Y - 2);
        context!.lineTo(tail, RAIL_Y - 2);
        context!.stroke();
        context!.globalAlpha = 1;

        if (effects.ring) {
          context!.strokeStyle = ramp(part);
          context!.globalAlpha = (0.12 + 0.12 * Math.sin(now * 0.009)) * decay;
          context!.lineWidth = 2;
          context!.beginPath();
          context!.arc(head, RAIL_Y - 2, 18 + 3 * Math.sin(now * 0.008), 0, Math.PI * 2);
          context!.stroke();
          context!.globalAlpha = 1;
        }

        if (effects.arc && Math.sin(now * 0.006) > 0.25) {
          context!.strokeStyle = ramp(1);
          context!.globalAlpha = decay;
          context!.lineWidth = 1.5;
          context!.beginPath();
          context!.moveTo(head - 20, RAIL_Y - 9);
          context!.lineTo(head - 12, RAIL_Y - 20);
          context!.lineTo(head - 5, RAIL_Y - 15);
          context!.lineTo(head + 3, RAIL_Y - 28);
          context!.lineTo(head + 15, RAIL_Y - 20);
          context!.stroke();
          context!.globalAlpha = 1;
        }
      }

      // Coulee : la surface garde l'elan, jamais la valeur.
      if (moving && effects.wave) {
        const amplitude =
          Math.min(4, 0.5 + part * 4) *
          Math.min(1, Math.abs(motion.current.travel) / 60) *
          decay;
        // A demi transparente, et fine : peinte en aplat, l'onde repeignait
        // toute la longueur a la couleur du sommet et effacait le degrade
        // qu'elle etait censee animer.
        context!.strokeStyle = ramp(part);
        context!.globalAlpha = 0.55;
        context!.lineWidth = 2.5;
        context!.lineCap = 'round';
        context!.beginPath();
        for (let x = start; x <= head; x += 3) {
          const y =
            RAIL_Y -
            1 +
            Math.sin(x * 0.085 - now * 0.009 * motion.current.direction) * amplitude;
          if (x === start) context!.moveTo(x, y);
          else context!.lineTo(x, y);
        }
        context!.stroke();
        context!.globalAlpha = 1;
      }

      // Les braises, qui finissent leur course apres la fenetre.
      particles.current = particles.current.filter((particle) => particle.life > 0);
      context!.fillStyle = ramp(part);
      for (const particle of particles.current) {
        particle.life -= step;
        particle.x += particle.vx * step;
        particle.y += particle.vy * step;
        context!.globalAlpha = Math.max(0, particle.life);
        context!.fillRect(particle.x, particle.y, 2, 3);
      }
      context!.globalAlpha = 1;

      if (moving || particles.current.length > 0) {
        frame.current = requestAnimationFrame(tick);
      } else {
        stop();
      }
    }

    // La toile suit la densité de l'écran, plafonnée à 2 : au-delà, on paye des
    // pixels que personne ne distingue.
    element.width = Math.max(1, Math.round(width * density));
    element.height = Math.round(CANVAS_HEIGHT * density);
    context.setTransform(density, 0, 0, density, 0, 0);

    open.current = (signal: ScalePulse) => {
      motion.current = { direction: signal.direction || 1, travel: signal.travel };
      until.current = performance.now() + ACTIVITY_MS;
      if (signal.burst) emit(5);
      if (!frame.current) frame.current = requestAnimationFrame(tick);
    };

    const onHidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      open.current = null;
      document.removeEventListener('visibilitychange', onHidden);
      stop();
    };
  }, [width]);

  useEffect(() => {
    if (pulse) open.current?.(pulse);
  }, [pulse]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none absolute left-0 z-10"
      style={{ top: -RAIL_Y, height: CANVAS_HEIGHT, width }}
    />
  );
}
