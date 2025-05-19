"use client"

import type React from "react"

import { useState, useRef, type ReactNode } from "react"
import { Upload, type File, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  onFileUpload: (file: File) => void
  acceptedFileTypes: string
  currentFilename?: string
  icon?: ReactNode
  label?: string
}

export function FileUploader({
  onFileUpload,
  acceptedFileTypes,
  currentFilename,
  icon,
  label = "Drop your file here",
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      handleFile(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      handleFile(file)
    }
  }

  const handleFile = (file: File) => {
    // Check if file type is accepted
    if (!file.name.match(new RegExp(`(${acceptedFileTypes.split(",").join("|").replace(/\./g, "\\.")})`))) {
      alert(`Please upload a file with one of these extensions: ${acceptedFileTypes}`)
      return
    }

    onFileUpload(file)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200",
        isDragging ? "border-red-500 bg-pink-50" : "border-gray-400 hover:border-red-400 hover:bg-pink-50",
        currentFilename ? "bg-green-50 border-green-500" : "",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileInput} accept={acceptedFileTypes} className="hidden" />

      <div className="flex flex-col items-center justify-center gap-2 py-4">
        {currentFilename ? (
          <>
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm font-bold text-gray-700 mt-2">File uploaded successfully!</p>
            <p className="text-xs text-gray-500 break-all max-w-full">{currentFilename}</p>
            <p className="text-xs text-red-600 mt-2 font-bold">Click or drag to replace</p>
          </>
        ) : (
          <>
            {icon || <Upload className="h-12 w-12 text-red-500" />}
            <p className="text-sm font-bold text-gray-700 mt-2">{label}</p>
            <p className="text-xs text-gray-500 font-medium">Click or drag and drop</p>
            <p className="text-xs text-gray-400 mt-1">Accepted file types: {acceptedFileTypes}</p>
          </>
        )}
      </div>
    </div>
  )
}
