import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DataTablePaginationProps = {
  page: number
  pageCount: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
  className?: string
}

const defaultPageSizes = [5, 10, 20, 50]

function DataTablePagination({
  page,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = defaultPageSizes,
  className,
}: DataTablePaginationProps) {
  const canPrevious = page > 1
  const canNext = page < pageCount

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-sidebar-border/70 px-4 py-3 text-sm",
        className
      )}
    >
      <div className="text-xs text-muted-foreground">
        {totalItems} result{totalItems === 1 ? "" : "s"}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value))
            }
            className="h-8 rounded-sm border border-input bg-transparent px-2 text-xs shadow-xs"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrevious}
          >
            Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export { DataTablePagination }
