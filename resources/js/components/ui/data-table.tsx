import * as React from "react"

import { cn } from "@/lib/utils"

const DataTable = React.forwardRef<
  HTMLTableElement,
  React.ComponentProps<"table">
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    data-slot="data-table"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))

DataTable.displayName = "DataTable"

export { DataTable }
