"use client";

import React, { useEffect, useRef } from "react";

export interface AdminTableColumn<T> {
  /** Identificativo della colonna. Usato come `key` React e come valore di sort. */
  key: string;
  /** Testo header tabella desktop e (di default) etichetta nella card mobile. */
  header: string;
  /** Render del contenuto cella per una riga. */
  cell: (row: T) => React.ReactNode;
  /** Allineamento del testo nella cella desktop. */
  align?: "left" | "right" | "center";
  /** Se true, header desktop diventa cliccabile e mostra l'icona di sort. */
  sortable?: boolean;
  /** Classi extra applicate sia a `<th>` che a `<td>`. */
  className?: string;
  /** Se true, la colonna è nascosta dalla card mobile (oltre che dalla tabella desktop sotto sm). */
  hideOnMobile?: boolean;
  /** Etichetta da mostrare nella card mobile davanti al valore. Default: `header`. */
  mobileLabel?: string;
}

export interface AdminTableProps<T> {
  rows: T[];
  columns: AdminTableColumn<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Render dei bottoni Azioni. Lo wrapper applica già stopPropagation. */
  renderActions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  /** Sort gestito dal parent. */
  sortField?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  /** Attiva la colonna checkbox di selezione (riga + header con select-all). */
  selectable?: boolean;
  /** Set degli id selezionati. Il parent decide quale rappresentazione usare; qui leggiamo solo `.has(id)`. */
  selectedIds?: ReadonlySet<string>;
  /** Callback toggle riga singola (chiamato col rowKey già calcolato). */
  onToggleRowSelection?: (id: string) => void;
  /** Callback "select all visible" — il parent decide se aggiungere tutti i visibili o azzerarli. */
  onToggleAllVisible?: () => void;
}

const thBase = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500";
const tdBase = "px-4 py-3 text-sm text-slate-700";

function alignClass(align?: "left" | "right" | "center") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function SortIcon({ active, dir }: { active: boolean; dir?: "asc" | "desc" }) {
  if (!active) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function AdminTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  renderActions,
  emptyMessage = "Nessun risultato.",
  sortField,
  sortDir,
  onSort,
  selectable = false,
  selectedIds,
  onToggleRowSelection,
  onToggleAllVisible,
}: AdminTableProps<T>) {
  // Header checkbox indeterminate: HTML non lo accetta come attributo statico,
  // serve impostarlo via DOM. Calcoliamo in render quante righe visibili sono
  // selezionate; useEffect riallinea il flag indeterminate quando cambia.
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const visibleSelectedCount = selectable && selectedIds
    ? rows.filter((r) => selectedIds.has(rowKey(r))).length
    : 0;
  const allVisibleSelected = selectable && rows.length > 0 && visibleSelectedCount === rows.length;
  const someVisibleSelected = selectable && visibleSelectedCount > 0 && visibleSelectedCount < rows.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="py-12 text-center text-sm text-slate-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <>
      {/* DESKTOP: tabella tradizionale (>= sm) */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {selectable && (
                <th className={`${thBase} w-10`} onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    aria-label="Seleziona tutte le righe visibili"
                    checked={allVisibleSelected}
                    onChange={() => onToggleAllVisible?.()}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isActive = sortField === col.key;
                const clickable = col.sortable && onSort;
                return (
                  <th
                    key={col.key}
                    className={`${thBase} ${alignClass(col.align)} ${col.className ?? ""} ${clickable ? "cursor-pointer select-none hover:text-slate-800" : ""}`}
                    onClick={clickable ? () => onSort!(col.key) : undefined}
                  >
                    {col.header}
                    {col.sortable && <SortIcon active={isActive} dir={sortDir} />}
                  </th>
                );
              })}
              {renderActions && <th className={thBase}>Azioni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row) => {
              const id = rowKey(row);
              const isSelected = selectable && selectedIds ? selectedIds.has(id) : false;
              return (
                <tr
                  key={id}
                  className={`hover:bg-slate-50 ${onRowClick ? "cursor-pointer" : ""} ${isSelected ? "bg-blue-50" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <td className={tdBase} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label="Seleziona riga"
                        checked={isSelected}
                        onChange={() => onToggleRowSelection?.(id)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`${tdBase} ${alignClass(col.align)} ${col.className ?? ""}`}>
                      {col.cell(row)}
                    </td>
                  ))}
                  {renderActions && (
                    <td className={tdBase} onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">{renderActions(row)}</div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE: cards (< sm) */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => {
          const id = rowKey(row);
          const isSelected = selectable && selectedIds ? selectedIds.has(id) : false;
          return (
            <div
              key={id}
              className={`rounded-lg border bg-white p-4 shadow-sm ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""} ${isSelected ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {selectable && (
                <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      aria-label="Seleziona riga"
                      checked={isSelected}
                      onChange={() => onToggleRowSelection?.(id)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Seleziona
                  </label>
                </div>
              )}
              <div className="space-y-2">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((col) => (
                    <div key={col.key} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {col.mobileLabel ?? col.header}
                      </span>
                      <span className="min-w-0 text-right text-slate-700">{col.cell(row)}</span>
                    </div>
                  ))}
              </div>
              {renderActions && (
                <div
                  className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 pt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderActions(row)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
