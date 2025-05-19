"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle } from "lucide-react"

interface DataDisplayProps {
  data: string[][]
  phoneColumn: string
  processedNumbers: string[]
}

export function DataDisplay({ data, phoneColumn, processedNumbers }: DataDisplayProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 border-2 border-black rounded-md bg-gray-50">
        <p className="text-gray-500 font-bold">No data available. Upload a CSV file to see the preview.</p>
      </div>
    )
  }

  // Get headers from first row or generate default headers
  const headers = data[0] || []

  // Find the phone column index
  const phoneColumnIndex = headers.findIndex(
    (header) => header.toLowerCase().trim() === phoneColumn.toLowerCase().trim(),
  )

  // Get up to 10 rows of data (excluding header row)
  const rows = data.slice(1, 11)

  return (
    <div className="border-2 border-black rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-yellow-300">
            <TableRow>
              <TableHead className="w-10 text-center font-black text-black">#</TableHead>
              <TableHead className="w-16 text-center font-black text-black">Status</TableHead>
              {headers.map((header, index) => (
                <TableHead
                  key={index}
                  className={`font-black ${index === phoneColumnIndex ? "text-red-600" : "text-black"}`}
                >
                  {header || `Column ${index + 1}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => {
                const phoneValue = phoneColumnIndex !== -1 ? row[phoneColumnIndex]?.trim() : null
                const isProcessed = phoneValue ? processedNumbers.includes(phoneValue) : false

                return (
                  <TableRow key={rowIndex} className={isProcessed ? "bg-pink-50" : ""}>
                    <TableCell className="text-center text-gray-500 font-mono font-bold">{rowIndex + 1}</TableCell>
                    <TableCell className="text-center">
                      {phoneValue ? (
                        isProcessed ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    {row.map((cell, cellIndex) => (
                      <TableCell
                        key={cellIndex}
                        className={cellIndex === phoneColumnIndex ? "font-bold text-red-600" : ""}
                      >
                        {cell || <span className="text-gray-400">Empty</span>}
                      </TableCell>
                    ))}
                    {/* Fill in empty cells if row has fewer cells than headers */}
                    {row.length < headers.length &&
                      Array(headers.length - row.length)
                        .fill(0)
                        .map((_, i) => (
                          <TableCell key={`empty-${i}`}>
                            <span className="text-gray-400">Empty</span>
                          </TableCell>
                        ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={headers.length + 2} className="text-center py-4 text-gray-500 font-bold">
                  No data rows found in the CSV file
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data.length > 11 && (
        <div className="py-2 px-4 bg-yellow-300 text-xs text-black font-bold text-right">
          Showing 10 of {data.length - 1} entries
        </div>
      )}
    </div>
  )
}
