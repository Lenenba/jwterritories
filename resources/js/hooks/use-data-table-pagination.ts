import { useEffect, useMemo, useState } from "react"

type UseDataTablePaginationOptions = {
  initialPageSize?: number
}

export function useDataTablePagination<T>(
  items: T[],
  options: UseDataTablePaginationOptions = {}
) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(options.initialPageSize ?? 10)

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [page, pageCount])

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), pageCount)
    setPage(clamped)
  }

  const handlePageSizeChange = (nextPageSize: number) => {
    setPage(1)
    setPageSize(nextPageSize)
  }

  return {
    page,
    pageSize,
    pageCount,
    totalItems: items.length,
    paginatedItems,
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
  }
}
