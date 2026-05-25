'use client';

interface PhoneFieldProps {
  placeholder?: string;
}

export function PhoneField({ placeholder }: PhoneFieldProps) {
  return (
    <div style={{ position: 'relative' }}>

      {/* CHAMP PRINCIPAL - Version statique pour le builder */}
      <div style={{
        display: 'flex',
        border: '1px solid var(--papyrus-border)',
        borderRadius: '8px',
        overflow: 'visible',
        background: 'var(--papyrus-surface)'
      }}>

        {/* BADGE PAYS — non cliquable en mode builder */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRight: '1px solid var(--papyrus-border)',
            background: 'transparent',
            minWidth: '90px',
            fontSize: '14px'
          }}
        >
          <span>🇲🇺</span>
          <span style={{ color: 'var(--text-secondary)' }}>+230</span>
        </div>

        {/* INPUT NUMÉRO — disabled en mode builder */}
        <input
          type="tel"
          disabled
          placeholder={placeholder || "57 12 34 56"}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            outline: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'default'
          }}
        />
      </div>
    </div>
  );
}