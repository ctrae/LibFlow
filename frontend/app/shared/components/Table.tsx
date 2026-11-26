import React, { useState } from "react";
import IconButton from "./IconButton";
import Input from "./Input";

export type TableColumn<T> = {
  key: keyof T;
  label: string;
  widthClass: string;
  render?: (row: T) => React.ReactNode;
};

type TableProps<T> = {
  columns: TableColumn<T>[];
  data: T[];
  selectable?: boolean;
  actions?: (row: T) => React.ReactNode;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  blur?: boolean;
  onPageChange?: (page: number) => void;
};

export default function Table<T>({
  columns = [] as TableColumn<T>[],
  data = [] as T[],
  selectable = false,
  actions,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  blur = false,
}: TableProps<T>) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<number>>(
    new Set(),
  );

  const handlePageChange = (page: number) => {
    if (onPageChange && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  // Select all / deselect all
  const handleSelectAll = () => {
    if (selectedRowKeys.size === data.length) {
      setSelectedRowKeys(new Set());
    } else {
      setSelectedRowKeys(new Set(data.keys()));
    }
  };

  const toggleRow = (index: number) => {
    const newSet = new Set(selectedRowKeys);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedRowKeys(newSet);
  };

  const getDisplayValue = (row: T, col: TableColumn<T>): React.ReactNode => {
    if (col.render) {
      return col.render(row);
    }
    const value = row[col.key];
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object" && !React.isValidElement(value)) {
      return JSON.stringify(value);
    }
    return value as React.ReactNode;
  };

  return (
    <div className="lg:overflow-x-auto">
      <div>
        {/* Table Header — desktop only */}
        <div className="hidden lg:flex bg-secondary p-4 gap-2 font-semibold text-sm text-primary border-b border-gray-200">
          {selectable && (
            <div className="w-4 flex items-center">
              <Input
                type="checkbox"
                className="!h-4 !w-4 accent-secondary cursor-pointer"
                checked={selectedRowKeys.size === data.length}
                onChange={handleSelectAll}
              />
            </div>
          )}
          <div className="flex justify-between w-full">
            {columns.map((col) => (
              <label
                key={String(col.key)}
                className={`${col.widthClass} flex items-center`}
              >
                <span>{col.label}</span>
              </label>
            ))}
            {actions && (
              <p className="w-20 font-semibold text-sm text-gray-600 ">
                Actions
              </p>
            )}
          </div>
        </div>

        {/* Mobile select-all */}
        {selectable && (
          <div className="lg:hidden p-4 flex items-center gap-2 text-sm text-gray-600 border-b border-gray-200">
            <Input
              type="checkbox"
              className="!h-4 !w-4 accent-secondary cursor-pointer"
              checked={data.length > 0 && selectedRowKeys.size === data.length}
              onChange={handleSelectAll}
            />
            <span className="font-semibold">
              {selectedRowKeys.size > 0
                ? `${selectedRowKeys.size} selected`
                : "Select all"}
            </span>
          </div>
        )}

        {/* Table Rows */}
        {data.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="p-4 flex gap-3 font-medium text-sm text-gray-600 border-b border-gray-200"
          >
            {selectable && (
              <div className="w-4 flex items-start lg:items-center pt-1 lg:pt-0">
                <Input
                  type="checkbox"
                  className="!h-4 !w-4 accent-secondary cursor-pointer"
                  checked={selectedRowKeys.has(rowIndex)}
                  onChange={() => toggleRow(rowIndex)}
                />
              </div>
            )}
            <div
              className={`flex flex-col lg:flex-row lg:justify-between w-full gap-2 lg:gap-0 ${blur && "blur-xs"}`}
            >
              {columns.map((col) => {
                const value = getDisplayValue(row, col);
                return (
                  <React.Fragment key={String(col.key)}>
                    {/* Mobile: stacked label / value */}
                    <div className="flex justify-between items-start gap-3 lg:hidden">
                      <span className="font-semibold text-gray-600 shrink-0">
                        {col.label}
                      </span>
                      <span className="text-right">{value}</span>
                    </div>
                    {/* Desktop: width-constrained cell */}
                    <div
                      className={`hidden lg:flex lg:items-center ${col.widthClass}`}
                    >
                      <span>{value}</span>
                    </div>
                  </React.Fragment>
                );
              })}
              {actions && (
                <>
                  <div className="flex justify-between items-center gap-2 lg:hidden">
                    <span className="font-semibold text-gray-600 shrink-0">
                      Actions
                    </span>
                    <div className="flex gap-2">{actions(row)}</div>
                  </div>
                  <div className="hidden lg:flex w-20 gap-2">
                    {actions(row)}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-4 text-sm text-gray-600">
            <p>
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={isFirstPage}
                className={`px-3 py-1 rounded ${
                  isFirstPage
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-100"
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={isLastPage}
                className={`px-3 py-1 rounded ${
                  isLastPage
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-100"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
