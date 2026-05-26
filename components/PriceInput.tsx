"use client";

import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
}

const formatForDisplay = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return "";
  // Sempre con il punto come separatore decimale, no formatting locale.
  // L'utente in input può digitare comma o punto, lo standardizziamo all'output.
  return String(n);
};

const parseInput = (s: string): number => {
  const normalized = s.replace(",", ".").trim();
  if (normalized === "" || normalized === ".") return 0;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
};

const PriceInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, invalid, className, disabled, ...rest }, ref) => {
    const [display, setDisplay] = useState(() => formatForDisplay(value));
    const focused = useRef(false);

    // Sincronizza il display col `value` esterno solo quando l'input non è in focus,
    // così mentre l'utente sta digitando "1." non sovrascriviamo il punto in fondo.
    useEffect(() => {
      if (!focused.current) {
        setDisplay(formatForDisplay(value));
      }
    }, [value]);

    const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Consenti solo cifre + opzionale separatore (. o ,) + max 2 decimali.
      // Rifiutiamo silenziosamente caratteri/decimali in eccesso: lo `pattern`
      // dell'input HTML viene applicato solo al submit, qui blocchiamo prima.
      if (!/^\d*([.,]\d{0,2})?$/.test(raw)) return;
      setDisplay(raw);
      onChange(parseInput(raw));
    };

    const onBlur = () => {
      focused.current = false;
      // Snap del display al numero canonico (es. "1," → "1", "1.50" → "1.5").
      const n = parseInput(display);
      setDisplay(formatForDisplay(n));
      onChange(n);
    };

    const onFocus = () => {
      focused.current = true;
    };

    // Evita che la rotella del mouse modifichi il valore (default browser su type=number,
    // qui usiamo type=text quindi già immune; manteniamo blur per consistenza con number-like).
    const onWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      (e.currentTarget as HTMLInputElement).blur();
    };

    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-500">
          €
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]{0,2}"
          autoComplete="off"
          value={display}
          onChange={onInput}
          onBlur={onBlur}
          onFocus={onFocus}
          onWheel={onWheel}
          disabled={disabled}
          className={
            className ??
            `w-full pl-7 pr-3 py-2 border rounded-md text-sm ${
              invalid ? "border-red-500" : "border-slate-300"
            } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed`
          }
          placeholder="29.99"
          {...rest}
        />
      </div>
    );
  }
);

PriceInput.displayName = "PriceInput";

export default PriceInput;
