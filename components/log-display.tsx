"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LogDisplayProps {
  entries: string[]
  onClear: () => void
}

export function LogDisplay({ entries, onClear }: LogDisplayProps) {
  const handleClearClick = () => {
    if (typeof onClear === 'function') {
      onClear()
    }
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 border-2 border-black rounded-md bg-gray-50">
        <p className="text-gray-500 font-bold">No contacts have been processed yet.</p>
      </div>
    )
  }

  return (
    <div className="border-2 border-black rounded-md overflow-hidden">
      <div className="flex justify-end p-2 bg-yellow-300 border-b-2 border-black">
        <Button
          onClick={handleClearClick}
          size="sm"
          className="bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-transform active:translate-y-1 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.3)]"
        >
          <Trash2 className="h-4 w-4 mr-2" /> Clear Log
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-yellow-300">
            <TableRow>
              <TableHead className="w-16 font-black text-black">#</TableHead>
              <TableHead className="w-16 text-center font-black text-black">Status</TableHead>
              <TableHead className="font-black text-black">Phone Number</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow key={index}>
                <TableCell className="font-mono text-gray-500 font-bold">{index + 1}</TableCell>
                <TableCell className="text-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                </TableCell>
                <TableCell className="font-bold text-red-600">{entry}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
