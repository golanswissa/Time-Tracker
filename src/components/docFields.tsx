import { useState } from 'react';
import { formatDDMMYYYY, formatMoney } from '../utils';

// Editable primitives shared by the invoice and quote documents. Each hides its
// input chrome when `disabled` so the printed/final document reads as plain text.

/** Inline input that renders as plain text when disabled. */
export function EditableInline({
  value, onChange, placeholder, disabled, className,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; className?: string;
}) {
  if (disabled) {
    return <span className={className}>{value || placeholder || ''}</span>;
  }
  return (
    <input
      className={`inv-input ${className || ''}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function EditableArea({
  value, onChange, placeholder, disabled, className, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; className?: string; rows?: number;
}) {
  if (disabled) {
    return value
      ? <div className={className} style={{ whiteSpace: 'pre-line' }}>{value}</div>
      : null;
  }
  return (
    <textarea
      className={`inv-input inv-textarea ${className || ''}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
    />
  );
}

export function EditableNumber({
  value, onChange, disabled, className,
}: {
  value: number; onChange: (v: number) => void; disabled?: boolean; className?: string;
}) {
  const [text, setText] = useState<string>(String(value));
  if (disabled) {
    return <span className={className}>{value}</span>;
  }
  return (
    <input
      className={`inv-input ${className || ''}`}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (!isNaN(n) && n >= 0) onChange(n);
      }}
      onBlur={() => setText(String(value))}
      inputMode="decimal"
    />
  );
}

export function EditableMoney({
  value, onChange, disabled, symbol, className, short,
}: {
  value: number; onChange: (v: number) => void; disabled?: boolean;
  symbol: string; className?: string; short?: boolean;
}) {
  const [text, setText] = useState<string>(String(value));
  if (disabled) {
    return (
      <span className={className}>
        {short ? `${symbol}${value}` : formatMoney(value, symbol)}
      </span>
    );
  }
  return (
    <input
      className={`inv-input ${className || ''}`}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (!isNaN(n) && n >= 0) onChange(n);
      }}
      onBlur={() => setText(String(value))}
      inputMode="decimal"
    />
  );
}

export function EditableDate({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  if (disabled) {
    return <span>{formatDDMMYYYY(value)}</span>;
  }
  return (
    <input
      type="date"
      className="inv-input inv-date-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function PaymentLine({
  label, value, onChange, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="inv-payment-line">
      <span>{label}:&nbsp;</span>
      <EditableInline value={value} disabled={disabled} onChange={onChange} />
    </div>
  );
}
