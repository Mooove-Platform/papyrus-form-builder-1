'use client';

import { Layout, Circle, Move } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import type { FormTheme } from '@/types';
import { cn } from '@/lib/utils';
import {
  DEFAULT_BANNER_HEIGHT,
  bannerFit,
  bannerImageStyle,
  coverScale
} from '@/lib/banner-frame';

type HandleId = 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br';

interface Props {
  theme: FormTheme;
  selectedElement: 'banner' | 'logo' | null;
  /**
   * Sélection de la bannière et du logo — le constructeur seulement.
   *
   * Facultatifs, et c'est ce qui compte : `ClosedFormPage` est un composant
   * SERVEUR, et Next refuse qu'un composant serveur passe une fonction à un
   * composant client. Rendre l'écran « ce formulaire est clos » plantait donc
   * avec une erreur 500, pour la seule raison qu'il transmettait deux rappels
   * vides à un en-tête qui, en mode aperçu, ne les appelle jamais.
   */
  onSelectBanner?: () => void;
  onSelectLogo?: () => void;
  onThemeChange?: (patch: Partial<FormTheme>) => void;
  preview?: boolean;
}

// Composant ResizeHandles — 8 poignées hors du overflow:hidden
interface ResizeHandlesProps {
  onResizeStart: (e: React.MouseEvent, handle: HandleId) => void;
}

function ResizeHandles({ onResizeStart }: ResizeHandlesProps) {
  const handleStyle = {
    position: 'absolute' as const,
    width: '12px',
    height: '12px',
    background: 'white',
    border: '2.5px solid var(--mooove-cyan)',
    borderRadius: '3px',
    zIndex: 30
  };

  return (
    <>
      {/* Top row */}
      <div
        onMouseDown={(e) => onResizeStart(e, 'tl')}
        className="cursor-nwse-resize"
        style={{ ...handleStyle, top: '-6px', left: '-6px' }}
      />
      <div
        onMouseDown={(e) => onResizeStart(e, 'tm')}
        className="cursor-ns-resize"
        style={{ ...handleStyle, top: '-6px', left: 'calc(50% - 6px)' }}
      />
      <div
        onMouseDown={(e) => onResizeStart(e, 'tr')}
        className="cursor-nesw-resize"
        style={{ ...handleStyle, top: '-6px', right: '-6px' }}
      />

      {/* Middle row */}
      <div
        onMouseDown={(e) => onResizeStart(e, 'ml')}
        className="cursor-ew-resize"
        style={{ ...handleStyle, top: 'calc(50% - 6px)', left: '-6px' }}
      />
      <div
        onMouseDown={(e) => onResizeStart(e, 'mr')}
        className="cursor-ew-resize"
        style={{ ...handleStyle, top: 'calc(50% - 6px)', right: '-6px' }}
      />

      {/* Bottom row */}
      <div
        onMouseDown={(e) => onResizeStart(e, 'bl')}
        className="cursor-nesw-resize"
        style={{ ...handleStyle, bottom: '-6px', left: '-6px' }}
      />
      <div
        onMouseDown={(e) => onResizeStart(e, 'bm')}
        className="cursor-ns-resize"
        style={{ ...handleStyle, bottom: '-6px', left: 'calc(50% - 6px)' }}
      />
      <div
        onMouseDown={(e) => onResizeStart(e, 'br')}
        className="cursor-nwse-resize"
        style={{ ...handleStyle, bottom: '-6px', right: '-6px' }}
      />
    </>
  );
}

export function FormHeader({ theme, selectedElement, onSelectBanner, onSelectLogo, onThemeChange, preview = false }: Props) {
  const hasBanner = !!theme.banner_url;
  const hasLogo = !!theme.logo_url;
  const logoShape = theme.logo_shape ?? 'circle';

  // Deux refs
  const outerRef = useRef<HTMLDivElement>(null);       // div externe — pour positionner les poignées
  const containerRef = useRef<HTMLDivElement>(null);   // div interne — pour les calculs de drag pan

  // Local states to handle drag fluidly without triggering parent DB save on every pixel
  const [localPosX, setLocalPosX] = useState(theme.banner_position_x ?? 50);
  const [localPosY, setLocalPosY] = useState(theme.banner_position_y ?? 50);
  const [localScale, setLocalScale] = useState(theme.banner_scale ?? 1);

  const dragPositionRef = useRef({ x: theme.banner_position_x ?? 50, y: theme.banner_position_y ?? 50 });
  const dragScaleRef = useRef(theme.banner_scale ?? 1);

  useEffect(() => {
    setLocalPosX(theme.banner_position_x ?? 50);
    dragPositionRef.current.x = theme.banner_position_x ?? 50;
  }, [theme.banner_position_x]);

  useEffect(() => {
    setLocalPosY(theme.banner_position_y ?? 50);
    dragPositionRef.current.y = theme.banner_position_y ?? 50;
  }, [theme.banner_position_y]);

  useEffect(() => {
    setLocalScale(theme.banner_scale ?? 1);
    dragScaleRef.current = theme.banner_scale ?? 1;
  }, [theme.banner_scale]);

  // State pour stocker les dimensions natives de l'image
  const [natSize, setNatSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });

  // State pour stocker la largeur dynamique du conteneur (pour la réactivité mobile / redimensionnement)
  const [containerW, setContainerW] = useState<number>(600);

  /**
   * Deux modes, et un seul demande un réglage.
   *
   * « Voir entière » (`contain`) donne au bandeau la hauteur de l'image : rien
   * n'est rogné, il n'y a donc rien à cadrer. C'est le mode qui convient à une
   * bannière déjà dessinée — on la montre telle qu'elle a été faite.
   *
   * « Remplir » (`cover`) garde une hauteur choisie et laisse déplacer et
   * agrandir l'image dedans. C'est le mode qui convient à une photo.
   */
  const isContain = bannerFit(theme) === 'contain';
  const containerH = theme.banner_height ?? DEFAULT_BANNER_HEIGHT;

  // ResizeObserver pour garder containerW parfaitement synchronisé en temps réel
  useEffect(() => {
    if (!containerRef.current) return;

    setContainerW(containerRef.current.offsetWidth);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerW(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [hasBanner]);

  // Réinitialise le cadrage si l'URL de la bannière change (nouvelle image téléversée ou configurée)
  const lastUrlRef = useRef<string | null | undefined>(theme.banner_url);
  useEffect(() => {
    if (theme.banner_url !== lastUrlRef.current) {
      lastUrlRef.current = theme.banner_url;
      setNatSize({ w: 1, h: 1 });
      if (onThemeChange && theme.banner_url) {
        onThemeChange({
          banner_scale: undefined,
          banner_position_x: undefined,
          banner_position_y: undefined,
        });
      }
    }
  }, [theme.banner_url, onThemeChange]);

  const scale = localScale;
  const posXpct = localPosX;
  const posYpct = localPosY;

  const aspectRatio = natSize.w / natSize.h;
  const imgW = containerW * scale;
  const imgH = imgW / aspectRatio;  // hauteur proportionnelle au ratio natif
  const imgX = (containerW * posXpct / 100) - (imgW / 2);
  const imgY = (containerH * posYpct / 100) - (imgH / 2);

  /**
   * Le cadrage, calculé là où l'aperçu et la page publique le calculent aussi.
   * Voir `lib/banner-frame.ts` : c'est tout l'intérêt de l'avoir sorti d'ici.
   */
  const framedImageStyle = bannerImageStyle({
    ...theme,
    banner_scale: scale,
    banner_position_x: posXpct,
    banner_position_y: posYpct
  });

  // Fonction utilitaire clamp
  const _clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  // Initialisation du theme au mount si valeurs manquantes
  useEffect(() => {
    if (hasBanner && onThemeChange &&
        (theme.banner_scale === undefined ||
         theme.banner_position_x === undefined ||
         theme.banner_position_y === undefined)) {
      onThemeChange({
        banner_scale: 1,
        banner_position_x: 50,
        banner_position_y: 50,
      });
    }
  }, [hasBanner, theme.banner_scale, theme.banner_position_x, theme.banner_position_y, onThemeChange]);

  /**
   * Recadre au mieux quand on revient sur « Remplir ».
   *
   * Ce recalcul n'a plus lieu d'etre en « Voir entiere » : ce mode ne cadre
   * rien, il montre l'image entiere. Il ne sert donc qu'a repartir d'un
   * cadrage propre quand on rebascule sur « Remplir » — l'image couvre le
   * bandeau, centree, et on ajuste a partir de la si on veut.
   */
  const lastFitRef = useRef<string | undefined>(theme.banner_fit);
  useEffect(() => {
    if (!hasBanner || !onThemeChange || natSize.w === 1) return;
    if (lastFitRef.current === theme.banner_fit) return;

    lastFitRef.current = theme.banner_fit;
    if ((theme.banner_fit ?? 'cover') !== 'cover') return;

    onThemeChange({
      banner_scale: coverScale(natSize.w, natSize.h, containerW, containerH),
      banner_position_x: 50,
      banner_position_y: 50
    });
  }, [theme.banner_fit, hasBanner, natSize, containerW, containerH, onThemeChange]);

  // Logique drag PAN (déplacer l'image)
  const handlePanStart = (e: React.MouseEvent) => {
    if (!onThemeChange || !containerRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const sx = e.clientX;
    const sy = e.clientY;
    const ox = imgX;
    const oy = imgY;
    
    dragPositionRef.current = { x: localPosX, y: localPosY };

    const onMove = (ev: MouseEvent) => {
      const newX = ox + (ev.clientX - sx);
      const newY = oy + (ev.clientY - sy);

      // Conversion px → % (source de vérité)
      // posX% = ((imgX + imgW/2) / containerW) * 100
      const newPosX = Math.round(((newX + imgW / 2) / containerW) * 100);
      const newPosY = Math.round(((newY + imgH / 2) / containerH) * 100);

      const finalPosX = Math.min(100, Math.max(0, newPosX));
      const finalPosY = Math.min(100, Math.max(0, newPosY));

      dragPositionRef.current = { x: finalPosX, y: finalPosY };
      setLocalPosX(finalPosX);
      setLocalPosY(finalPosY);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      if (onThemeChange) {
        onThemeChange({
          banner_position_x: dragPositionRef.current.x,
          banner_position_y: dragPositionRef.current.y,
        });
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Logique RESIZE (poignées)
  const handleResizeStart = (e: React.MouseEvent, handle: HandleId) => {
    if (!onThemeChange || !containerRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const sx = e.clientX;
    const sy = e.clientY;
    const snap = { x: imgX, y: imgY, w: imgW, h: imgH };
    
    dragScaleRef.current = localScale;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      // Seules la largeur et la hauteur sont exploitées : le redimensionnement se
      // traduit en facteur d'échelle, pas en repositionnement. Les x/y calculés
      // ici n'étaient jamais lus.
      let { w, h } = snap;

      switch (handle) {
        case 'tl': w -= dx; h -= dy; break;
        case 'tm':          h -= dy; break;
        case 'tr': w += dx; h -= dy; break;
        case 'ml': w -= dx;          break;
        case 'mr': w += dx;          break;
        case 'bl': w -= dx; h += dy; break;
        case 'bm':          h += dy; break;
        case 'br': w += dx; h += dy; break;
      }

      // Taille minimum
      if (w < 100 || h < 80) return;

      // Conversion taille → scale avant onThemeChange
      const newScale = Math.round((w / containerW) * 100) / 100;  // arrondi 2 décimales
      const finalScale = Math.min(3, Math.max(0.05, newScale));
      
      dragScaleRef.current = finalScale;
      setLocalScale(finalScale);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      if (onThemeChange) {
        onThemeChange({
          banner_scale: dragScaleRef.current
        });
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // En mode preview, si aucune image n'est définie, le header est invisible
  if (preview && !hasBanner && !hasLogo) {
    return null;
  }

  // Gestion de l'espacement : si logo seul en preview, on garde un espace pour le logo
  const needsLogoSpace = preview && hasLogo && !hasBanner;

  // État d'édition pour la bannière
  const isEditing = !preview && selectedElement === 'banner' && hasBanner;

  return (
    <div className={cn("relative", needsLogoSpace ? "mb-12 pt-24" : "mb-12")}>
      {/* Zone Bannière - ne se rend qu'en mode éditeur OU si elle a une URL */}
      {(!preview || hasBanner) && (
        <div
          ref={outerRef}
          onClick={!preview ? onSelectBanner : undefined}
          style={{
            // Le bandeau était figé à 160 px : une bannière large y entrait
            // rognée ou minuscule, d'où le recadrage sans fin. Sa hauteur suit
            // maintenant le mode — l'image en « Voir entière », le réglage en
            // « Remplir ».
            height:
              hasBanner && isContain
                ? 'auto'
                : `${hasBanner ? containerH : DEFAULT_BANNER_HEIGHT}px`
          }}
          className={cn(
            'relative transition-colors',
            theme.banner_full_width
              ? 'w-screen ml-[calc(-50vw+50%)] mr-[calc(-50vw+50%)]'
              : 'w-full rounded-lg',
            !preview && 'cursor-pointer',
            selectedElement === 'banner' && 'ring-2 ring-accent',
            !hasBanner && 'border-2 border-dashed border-border-strong bg-bg-surface',
            !theme.banner_full_width && !hasBanner && 'rounded-lg'
          )}
        >
          {hasBanner ? (
            <>
              {/* Div interne — overflow:hidden, clip de l'image */}
              <div
                ref={containerRef}
                className={cn(!theme.banner_full_width && 'rounded-lg')}
                style={{
                  overflow: 'hidden',
                  position: 'relative',
                  // En « Voir entière », la hauteur vient de l'image elle-même.
                  height: isContain ? 'auto' : `${containerH}px`
                }}
              >
                {/* Une seule image, un seul style — constructeur, aperçu et page
                    publique dessinent désormais rigoureusement la même chose. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={theme.banner_url!}
                  alt="Bannière"
                  draggable={false}
                  style={framedImageStyle}
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    setNatSize({ w: el.naturalWidth, h: el.naturalHeight });
                  }}
                />

                {!preview && (
                  <>
                    {/* Zone de drag centrale */}
                    {isEditing && !isContain && (
                      <div
                        onMouseDown={handlePanStart}
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                        style={{ zIndex: 5 }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div
                            className="flex items-center justify-center"
                            style={{
                              width: '36px',
                              height: '36px',
                              backgroundColor: 'rgba(0,0,0,0.4)',
                              borderRadius: '50%'
                            }}
                          >
                            <Move className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overlay de sélection en mode éditeur (non sélectionnée) */}
                    {selectedElement !== 'banner' && (
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="opacity-0 hover:opacity-100 bg-white/90 px-3 py-1 rounded-md text-sm text-text-primary">
                          Cliquer pour modifier la bannière
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Poignées ICI — en dehors du overflow:hidden. Absentes en
                  « Voir entière » : il n'y a rien à recadrer, et une poignée
                  qui ne fait rien laisse croire que le réglage est cassé. */}
              {isEditing && !isContain && (
                <ResizeHandles onResizeStart={handleResizeStart} />
              )}
            </>
          ) : (
            !preview && (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                <div className="flex flex-col items-center gap-2">
                  <Layout className="h-8 w-8" />
                  <span className="text-sm font-medium">Ajouter une bannière</span>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Zone Logo - ne se rend qu'en mode éditeur OU si elle a une URL */}
      {(!preview || hasLogo) && (
        <div
          onClick={!preview ? onSelectLogo : undefined}
          className={cn(
            'absolute transition-colors',
            // Positionnement adaptatif selon la présence de bannière
            preview && !hasBanner
              ? 'top-4 left-8' // Logo en haut avec espace en preview sans bannière
              : 'bottom-[-25%] left-8', // Position à cheval normale : 50% sur bannière, 50% sur fond blanc
            'w-20 h-20', // Taille fixe du conteneur (80px x 80px)
            'overflow-hidden', // Confine l'image zoomée dans le cercle
            'border-4 border-white shadow-lg', // Bordure blanche style LinkedIn
            !preview && 'cursor-pointer',
            selectedElement === 'logo' && 'ring-2 ring-accent ring-offset-2'
          )}
          style={{
            borderRadius: logoShape === 'circle' ? '50%' : logoShape === 'rounded' ? '12px' : '8px'
          }}
        >
          {hasLogo ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme.logo_url!}
                alt="Logo"
                className={cn(
                  'w-full h-full object-cover transition-transform',
                  logoShape === 'circle' ? 'rounded-full' : logoShape === 'rounded' ? 'rounded-xl' : 'rounded-sm'
                )}
                style={{
                  transform: `scale(${theme.logo_size ?? 1})`, // Zoom appliqué uniquement sur l'image
                  transformOrigin: 'center center' // Centre le zoom sur l'image
                }}
              />
              {/* Overlay de sélection en mode éditeur */}
              {!preview && (
                <div className={cn(
                  'absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center',
                  logoShape === 'circle' ? 'rounded-full' : logoShape === 'rounded' ? 'rounded-xl' : 'rounded-sm'
                )}>
                  <div className="opacity-0 hover:opacity-100 bg-white/90 px-2 py-1 rounded-sm text-xs text-text-primary whitespace-nowrap">
                    Modifier logo
                  </div>
                </div>
              )}
            </div>
          ) : (
            !preview && (
              <div
                className={cn(
                  "w-full h-full border-2 border-dashed border-border-strong bg-bg-surface flex items-center justify-center text-text-tertiary",
                  logoShape === 'circle' ? 'rounded-full' : logoShape === 'rounded' ? 'rounded-xl' : 'rounded-sm'
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <Circle className="h-6 w-6" />
                  <span className="text-[10px] font-medium">Logo</span>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}