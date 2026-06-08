'use client';

import { useMemo } from 'react';
import type { Form, Field, LogicRule } from '@/types';
import { cn } from '@/lib/utils';
import {
  GitFork,
  HelpCircle,
  Type,
  AlignLeft,
  Mail,
  Phone,
  Binary,
  Globe,
  CheckCircle,
  CheckSquare,
  List,
  Star,
  BarChart,
  Calendar,
  FileUp,
  Grid,
  Volume2
} from 'lucide-react';

interface Props {
  form: Form;
}

interface RenderNode {
  id: string;
  type: 'field' | 'decision' | 'end';
  label: string;
  subtitle?: string;
  isConditional?: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RenderEdge {
  id: string;
  fromId: string;
  toId: string;
  path: string;
  isDefault: boolean;
  label?: string;
}

function getFieldTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    short_text: 'Réponse courte',
    long_text: 'Réponse longue',
    email: 'Adresse e-mail',
    phone: 'Téléphone',
    number: 'Nombre',
    url: 'Lien site web',
    single_choice: 'Choix unique',
    multiple_choice: 'Choix multiple',
    dropdown: 'Liste déroulante',
    rating: 'Évaluation',
    nps: 'Score NPS',
    date: 'Date',
    file: 'Fichier / Média',
    matrix: 'Matrice',
    statement: 'Message / Note',
    section_break: 'Section'
  };
  return labels[type] || type;
}

function getFieldLucideIcon(type: string) {
  switch (type) {
    case 'short_text': return Type;
    case 'long_text': return AlignLeft;
    case 'email': return Mail;
    case 'phone': return Phone;
    case 'number': return Binary;
    case 'url': return Globe;
    case 'single_choice': return CheckCircle;
    case 'multiple_choice': return CheckSquare;
    case 'dropdown': return List;
    case 'rating': return Star;
    case 'nps': return BarChart;
    case 'date': return Calendar;
    case 'file': return FileUp;
    case 'matrix': return Grid;
    case 'statement': return Volume2;
    default: return HelpCircle;
  }
}

function getConditionLabel(rule: LogicRule, fields: Field[]): string {
  if (!rule.conditions || rule.conditions.length === 0) return 'Si rempli';

  const condTexts = rule.conditions.map(c => {
    const sourceField = fields.find(f => f.id === c.source_field_id);
    let valText = c.value;
    if (sourceField && sourceField.options) {
      const opt = sourceField.options.find(o => o.id === c.value);
      if (opt && opt.label?.fr) {
        valText = opt.label.fr;
      }
    }

    let opSymbol = '';
    switch (c.operator) {
      case 'equals': opSymbol = '='; break;
      case 'not_equals': opSymbol = '≠'; break;
      case 'contains': return `contient "${valText}"`;
      case 'not_contains': return `ne contient pas "${valText}"`;
      case 'greater_than': opSymbol = '>'; break;
      case 'less_than': opSymbol = '<'; break;
      default: opSymbol = c.operator;
    }
    return `${opSymbol} "${valText}"`;
  });

  if (condTexts.length === 1) {
    return `Si ${condTexts[0]}`;
  }

  const op = rule.conditions_operator === 'OR' ? ' OU ' : ' ET ';
  return `Si (${condTexts.join(op)})`;
}

function truncateText(text: string, maxLen = 22): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

function getBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dy = Math.abs(y2 - y1) / 2;
  return `M ${x1} ${y1} C ${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`;
}

export function FormFlowView({ form }: Props) {
  const fields = useMemo(() => {
    return (form.fields || [])
      .filter(f => f.type !== 'section_break')
      .sort((a, b) => a.field_order - b.field_order);
  }, [form.fields]);

  const rules = form.logic_rules || [];
  const hasRules = rules.length > 0;

  const layout = useMemo(() => {
    if (fields.length === 0) {
      return { nodes: [], edges: [], width: 800, height: 400, minX: 0, maxX: 800 };
    }

    // Paramètres graphiques premium
    const nodeW = 240;
    const nodeH = 72;
    const decisionW = 140;
    const decisionH = 32;
    const endW = 160;
    const endH = 40;
    const colW = 340;
    const rowH = 180;
    const centerX = 450;
    const paddingY = 60;

    const nodes: RenderNode[] = [];
    const edges: RenderEdge[] = [];

    // 1. Identifier les champs conditionnels (ceux affichés via show_field)
    const conditionalFields = new Set<string>();
    rules.forEach(r => {
      if (r.action_type === 'show_field' && r.target_field_id) {
        conditionalFields.add(r.target_field_id);
      }
    });

    // 2. Assigner des colonnes de façon récursive
    const colMap: Record<string, number> = {};
    fields.forEach(f => {
      if (!conditionalFields.has(f.id)) {
        colMap[f.id] = 0;
      }
    });

    const assignColumns = (fieldId: string, currentCol: number) => {
      const childRules = rules.filter(r =>
        r.action_type === 'show_field' &&
        r.target_field_id &&
        r.conditions?.some(c => c.source_field_id === fieldId)
      );

      childRules.forEach((r, index) => {
        const targetId = r.target_field_id!;
        if (colMap[targetId] === undefined) {
          const direction = index % 2 === 0 ? -1 : 1;
          const step = Math.floor(index / 2) + 1;
          const targetCol = currentCol + direction * step;
          colMap[targetId] = targetCol;
          assignColumns(targetId, targetCol);
        }
      });
    };

    fields.forEach(f => {
      if (!conditionalFields.has(f.id)) {
        assignColumns(f.id, 0);
      }
    });

    // Fallback pour tout champ non assigné
    fields.forEach(f => {
      if (colMap[f.id] === undefined) {
        colMap[f.id] = 0;
      }
    });

    // 3. Positionner les nœuds de champs
    fields.forEach((f, index) => {
      const col = colMap[f.id];
      const row = index;
      const x = centerX + col * colW - nodeW / 2;
      const y = paddingY + row * rowH;

      nodes.push({
        id: f.id,
        type: 'field',
        label: f.label.fr || 'Champ sans titre',
        subtitle: getFieldTypeLabel(f.type),
        isConditional: conditionalFields.has(f.id),
        x,
        y,
        w: nodeW,
        h: nodeH
      });
    });

    // 4. Positionner les nœuds de décision et créer les transitions logiques
    fields.forEach(f => {
      const fieldRules = rules.filter(r =>
        r.conditions?.some(c => c.source_field_id === f.id)
      ).sort((a, b) => a.rule_order - b.rule_order);

      if (fieldRules.length === 0) return;

      const fRow = fields.indexOf(f);
      const fCol = colMap[f.id];
      const K = fieldRules.length;

      fieldRules.forEach((rule, j) => {
        const decisionCol = fCol + (j - (K - 1) / 2) * 0.45;
        const x = centerX + decisionCol * colW - decisionW / 2;
        const y = paddingY + fRow * rowH + nodeH + 40;

        const decisionId = `decision-${rule.id}`;
        nodes.push({
          id: decisionId,
          type: 'decision',
          label: getConditionLabel(rule, fields),
          x,
          y,
          w: decisionW,
          h: decisionH
        });

        // Liaison : Champ source -> Décision
        edges.push({
          id: `edge-${f.id}-${decisionId}`,
          fromId: f.id,
          toId: decisionId,
          path: getBezierPath(
            centerX + fCol * colW,
            paddingY + fRow * rowH + nodeH,
            x + decisionW / 2,
            y
          ),
          isDefault: false
        });

        // Liaison : Décision -> Cible
        if (rule.action_type === 'end_form') {
          edges.push({
            id: `edge-${decisionId}-end`,
            fromId: decisionId,
            toId: 'end_form',
            path: getBezierPath(
              x + decisionW / 2,
              y + decisionH,
              centerX,
              paddingY + fields.length * rowH
            ),
            isDefault: false
          });
        } else if (rule.target_field_id) {
          const target = fields.find(tf => tf.id === rule.target_field_id);
          if (target) {
            const tRow = fields.indexOf(target);
            const tCol = colMap[target.id];
            edges.push({
              id: `edge-${decisionId}-${target.id}`,
              fromId: decisionId,
              toId: target.id,
              path: getBezierPath(
                x + decisionW / 2,
                y + decisionH,
                centerX + tCol * colW,
                paddingY + tRow * rowH
              ),
              isDefault: false
            });
          }
        }
      });
    });

    // 5. Nœud de fin
    const endX = centerX - endW / 2;
    const endY = paddingY + fields.length * rowH;
    nodes.push({
      id: 'end_form',
      type: 'end',
      label: 'Fin du formulaire',
      x: endX,
      y: endY,
      w: endW,
      h: endH
    });

    // 6. Transitions par défaut (séquentielles)
    fields.forEach((f, index) => {
      const hasUnconditionalEnd = rules.some(r =>
        r.action_type === 'end_form' &&
        (!r.conditions || r.conditions.length === 0) &&
        r.conditions?.some(c => c.source_field_id === f.id)
      );
      if (hasUnconditionalEnd) return;

      const nextMainField = fields.slice(index + 1).find(tf => !conditionalFields.has(tf.id));
      const targetId = nextMainField ? nextMainField.id : 'end_form';
      const targetRow = nextMainField ? fields.indexOf(nextMainField) : fields.length;
      const targetCol = nextMainField ? colMap[nextMainField.id] : 0;

      const fCol = colMap[f.id];
      const fRow = index;

      const hasFieldRules = rules.some(r => r.conditions?.some(c => c.source_field_id === f.id));
      let pathStr = '';

      // Si le champ a des règles conditionnelles, on dévie la ligne par défaut sur la gauche pour éviter les chevauchements
      if (hasFieldRules && fCol === 0 && targetCol === 0) {
        const startX = centerX + fCol * colW;
        const startY = paddingY + fRow * rowH + nodeH;
        const endX = centerX + targetCol * colW;
        const endY = paddingY + targetRow * rowH;
        pathStr = `M ${startX} ${startY} C ${startX - 180} ${startY + 30} ${endX - 180} ${endY - 30} ${endX} ${endY}`;
      } else {
        pathStr = getBezierPath(
          centerX + fCol * colW,
          paddingY + fRow * rowH + nodeH,
          centerX + targetCol * colW,
          paddingY + targetRow * rowH
        );
      }

      edges.push({
        id: `default-${f.id}-${targetId}`,
        fromId: f.id,
        toId: targetId,
        path: pathStr,
        isDefault: true
      });
    });

    // 7. Calculer les dimensions de la zone de dessin
    let minCol = 0;
    let maxCol = 0;
    Object.values(colMap).forEach(c => {
      if (c < minCol) minCol = c;
      if (c > maxCol) maxCol = c;
    });

    const marginL = minCol * colW - nodeW / 2 - 80;
    const marginR = maxCol * colW + nodeW / 2 + 80;

    const leftX = centerX + marginL;
    const rightX = centerX + marginR;

    const width = rightX - leftX;
    const height = endY + endH + 100;

    return {
      nodes,
      edges,
      width,
      height,
      minX: leftX,
      maxX: rightX
    };
  }, [fields, rules]);

  if (fields.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-12 text-center bg-[#F8FAFC]">
        <GitFork className="h-12 w-12 text-slate-400 mb-3 stroke-[1.5]" />
        <p className="font-display text-lg text-slate-700 font-semibold">Aucun champ dans ce formulaire</p>
        <p className="text-sm text-slate-500 mt-1">Ajoutez des questions pour générer le flux.</p>
      </div>
    );
  }

  const accentColor = form.theme?.accent || '#3B82F6';

  return (
    <div className="relative w-full h-full flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Note d'information logique si vide */}
      {!hasRules && (
        <div className="shrink-0 bg-white border-b border-slate-100 px-6 py-3.5 text-xs text-slate-500 italic font-medium flex items-center gap-2 shadow-sm relative z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 animate-pulse" />
          Aucune logique conditionnelle configurée. Affichage de la liste séquentielle par défaut.
        </div>
      )}

      {/* Container scrollable de l'arbre */}
      <div className="flex-1 overflow-auto p-12 flex items-start justify-start select-none">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="shrink-0"
        >
          {/* Définitions des filtres de drop-shadow et têtes de flèches */}
          <defs>
            <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#E2E8F0" />
            </pattern>
            
            <marker
              id="arrow-accent"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={accentColor} />
            </marker>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94A3B8" />
            </marker>
          </defs>

          {/* 0. Grille de fond pro */}
          <rect width={layout.width} height={layout.height} fill="url(#dot-grid)" />

          {/* Décaler tout le repère de minX pour que tout commence à x=0 */}
          <g transform={`translate(${-layout.minX}, 0)`}>
            {/* 1. Rendu des lignes de transition */}
            {layout.edges.map(edge => {
              const markerId = edge.isDefault ? 'arrow-default' : 'arrow-accent';
              return (
                <path
                  key={edge.id}
                  d={edge.path}
                  fill="none"
                  stroke={edge.isDefault ? '#94A3B8' : accentColor}
                  strokeWidth={edge.isDefault ? 1.5 : 2}
                  strokeDasharray={edge.isDefault ? '5,5' : undefined}
                  markerEnd={`url(#${markerId})`}
                  className="transition-all duration-300"
                />
              );
            })}

            {/* 2. Rendu des nœuds avec foreignObject pour un design HTML5/Tailwind sublime */}
            {layout.nodes.map(node => {
              if (node.type === 'field') {
                const isConditional = node.isConditional;
                const f = fields.find(field => field.id === node.id);
                const IconComponent = f ? getFieldLucideIcon(f.type) : HelpCircle;

                return (
                  <foreignObject
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    width={node.w}
                    height={node.h}
                    className="overflow-visible"
                  >
                    <div
                      className={cn(
                        "flex h-full w-full rounded-xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
                        isConditional
                          ? "border-orange-200 hover:border-orange-300 hover:shadow-orange-100/40"
                          : "border-slate-200/80 hover:border-slate-300 hover:shadow-slate-100/60"
                      )}
                    >
                      {/* Accent de couleur sur la gauche */}
                      <div
                        className={cn(
                          "w-1.5 h-full rounded-l-xl shrink-0",
                          isConditional ? "bg-orange-500" : "bg-blue-600"
                        )}
                        style={!isConditional ? { backgroundColor: accentColor } : undefined}
                      />
                      
                      {/* Contenu textuel et icône */}
                      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-800 text-[12px] truncate leading-tight select-none">
                            {node.label}
                          </span>
                          <span className="shrink-0 p-1 bg-slate-50 rounded text-slate-400">
                            <IconComponent size={12} className="stroke-[2]" />
                          </span>
                        </div>
                        
                        <div className="flex items-end justify-between gap-2 mt-1">
                          <span className="text-[10px] font-medium text-slate-400 truncate select-none">
                            {node.subtitle}
                          </span>
                          {isConditional && (
                            <span className="shrink-0 text-[8px] font-bold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100 uppercase tracking-wider select-none">
                              Conditionnel
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </foreignObject>
                );
              }

              if (node.type === 'decision') {
                return (
                  <foreignObject
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    width={node.w}
                    height={node.h}
                    className="overflow-visible"
                  >
                    <div className="flex items-center justify-center h-full w-full bg-cyan-50 border border-cyan-200 rounded-full shadow-sm px-3.5 py-1 text-center hover:bg-cyan-100/80 transition-all duration-300">
                      <span className="text-cyan-800 text-[10px] font-bold truncate select-none tracking-wide">
                        {node.label}
                      </span>
                    </div>
                  </foreignObject>
                );
              }

              if (node.type === 'end') {
                return (
                  <foreignObject
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    width={node.w}
                    height={node.h}
                    className="overflow-visible"
                  >
                    <div
                      className="flex items-center justify-center h-full w-full rounded-full shadow-sm border text-white font-semibold text-xs transition-all duration-300 hover:scale-[1.02] select-none"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor} 0%, #0F172A 100%)`,
                        borderColor: accentColor
                      }}
                    >
                      {node.label}
                    </div>
                  </foreignObject>
                );
              }

              return null;
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
