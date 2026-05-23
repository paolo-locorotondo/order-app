"use client";

import React from "react";

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
}: AdminTableProps<T>) {
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
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={`hover:bg-slate-50 ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
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
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE: cards (< sm) */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
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
        ))}
      </div>
    </>
  );
}
