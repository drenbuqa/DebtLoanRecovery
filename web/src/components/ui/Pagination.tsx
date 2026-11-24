"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw } from "lucide-react";

interface PaginationProps {
  page: number;
  pages: number;
  total?: number;
  perPage?: number;
  paging?: boolean;
  scrollId?: string;
  onPage: (p: number) => void;
  /** When true renders the count label on the left (default: true when total provided) */
  showCount?: boolean;
  className?: string;
}

function scrollTop(id?: string) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.scrollTop = 0;
}

const BTN = "w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors";

export function Pagination({
  page, pages, total, perPage = 25, paging = false,
  scrollId, onPage, showCount, className = "",
}: PaginationProps) {
  if (pages <= 1) return null;

  const hasCount = showCount !== false && total != null;
  const from = ((page - 1) * perPage) + 1;
  const to   = Math.min(page * perPage, total ?? page * perPage);

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {hasCount ? (
        <span className="text-[12px] text-gray-400 tabular-nums">
          {from}–{to} nga {total!.toLocaleString()}
        </span>
      ) : <span />}

      <div className="flex items-center gap-1.5">
        {/* First page */}
        <button
          disabled={page <= 1 || paging}
          onClick={() => { scrollTop(scrollId); onPage(1); }}
          className={BTN}
          title="Faqja e parë"
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Prev page */}
        <button
          disabled={page <= 1 || paging}
          onClick={() => { scrollTop(scrollId); onPage(page - 1); }}
          className={BTN}
          title="Faqja e mëparshme"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Counter */}
        <span className="text-[12px] text-gray-500 tabular-nums min-w-[60px] text-center flex items-center gap-1 justify-center">
          {paging && <RefreshCw size={11} className="animate-spin text-gray-400" />}
          {page} / {pages}
        </span>

        {/* Next page */}
        <button
          disabled={page >= pages || paging}
          onClick={() => { scrollTop(scrollId); onPage(page + 1); }}
          className={BTN}
          title="Faqja e ardhshme"
        >
          <ChevronRight size={15} />
        </button>

        {/* Last page */}
        <button
          disabled={page >= pages || paging}
          onClick={() => { scrollTop(scrollId); onPage(pages); }}
          className={BTN}
          title="Faqja e fundit"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}
