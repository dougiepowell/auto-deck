"use client"

interface ScriptDisplayProps {
  text: string
}

export function ScriptDisplay({ text }: ScriptDisplayProps) {
  if (!text) {
    return (
      <div className="flex items-center justify-center h-40 border-2 border-black rounded-md bg-gray-50">
        <p className="text-gray-500 font-bold">No message template available. Upload a text file to see the preview.</p>
      </div>
    )
  }

  return (
    <div className="border-2 border-black rounded-md p-6 bg-white max-h-[400px] overflow-y-auto">
      <pre className="whitespace-pre-wrap font-sans text-base text-gray-700 leading-relaxed">{text}</pre>
    </div>
  )
}
