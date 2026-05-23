"use client";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md";
}

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  size = "md",
}: QuantityStepperProps) {
  const clamp = (n: number) => {
    if (Number.isNaN(n)) return min;
    if (n < min) return min;
    if (max !== undefined && n > max) return max;
    return n;
  };

  const dec = () => onChange(clamp(value - 1));
  const inc = () => onChange(clamp(value + 1));

  const btnSize = size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9 text-base";
  const labelSize = size === "sm" ? "min-w-[2rem] text-sm" : "min-w-[2.5rem] text-base";

  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Diminuisci quantità"
        className={`${btnSize} rounded-l-lg text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        −
      </button>
      <span className={`${labelSize} select-none px-2 text-center font-medium tabular-nums`}>
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || (max !== undefined && value >= max)}
        aria-label="Aumenta quantità"
        className={`${btnSize} rounded-r-lg text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        +
      </button>
    </div>
  );
}
