"use client"

import * as React from "react"
import { cn } from "@bootleg/ui/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"
import { Skeleton } from "./skeleton"

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

export type ColumnDef<TData> = {
  /** 컬럼 고유 식별자 */
  id: string
  /** 헤더 텍스트 또는 노드 */
  header: React.ReactNode
  /** 셀 렌더러 */
  cell: (row: TData) => React.ReactNode
  /** th / td에 적용할 추가 className */
  className?: string
}

export type DataTableProps<TData> = {
  columns: ColumnDef<TData>[]
  data: TData[]
  /** 각 행의 고유 key 반환 함수 */
  keyExtractor: (row: TData) => string
  /** 행 클릭 핸들러 — 전달 시 행에 cursor-pointer 적용 */
  onRowClick?: (row: TData) => void
  /** 데이터 없을 때 표시할 메시지 */
  emptyMessage?: string
  /** 로딩 상태 */
  loading?: boolean
  /** 로딩 시 보여줄 스켈레톤 행 수 (기본값: 5) */
  loadingRows?: number
  className?: string
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export function DataTable<TData>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "데이터가 없습니다.",
  loading = false,
  loadingRows = 5,
  className,
}: DataTableProps<TData>) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <TableHead key={col.id} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading ? (
          // 로딩 스켈레톤
          Array.from({ length: loadingRows }).map((_, rowIdx) => (
            <TableRow key={rowIdx} className="hover:bg-transparent">
              {columns.map((col) => (
                <TableCell key={col.id} className={col.className}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : data.length === 0 ? (
          // 빈 상태
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={columns.length}
              className="h-24 text-center text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          // 데이터 행
          data.map((row) => (
            <TableRow
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && "cursor-pointer")}
            >
              {columns.map((col) => (
                <TableCell key={col.id} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
