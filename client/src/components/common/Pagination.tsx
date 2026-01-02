import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalItems, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-4 border-t border-zinc-100/50">
      <p className="text-[11px] text-zinc-400 font-medium">
        共 <span className="text-zinc-900">{totalItems}</span> 条记录
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 w-8 rounded-full hover:bg-white shadow-sm disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-[11px] font-mono text-zinc-500 px-2">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 w-8 rounded-full hover:bg-white shadow-sm disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}