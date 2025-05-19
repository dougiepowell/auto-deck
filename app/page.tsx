"use client"

import { useState, useEffect } from "react"
import { Upload, Copy, FileText, X, Keyboard, FileSpreadsheet, MessageSquare, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { FileUploader } from "@/components/file-uploader"
import { DataDisplay } from "@/components/data-display"
import { ScriptDisplay } from "@/components/script-display"
import { LogDisplay } from "@/components/log-display"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Image from "next/image"
import { PythonTest } from "@/components/PythonTest"
import { getNextPhone, pasteMessage } from "@/lib/python"
import { writeTextFile, readTextFile } from '@tauri-apps/api/fs'
import { invoke } from '@tauri-apps/api/tauri'

export default function Home() {
  const [csvData, setCsvData] = useState<string[][]>([])
  const [scriptText, setScriptText] = useState<string>("")
  const [logEntries, setLogEntries] = useState<string[]>([])
  const [csvFilename, setCsvFilename] = useState<string>("")
  const [scriptFilename, setScriptFilename] = useState<string>("")
  const [phoneColumn, setPhoneColumn] = useState<string>("phone")
  const [uniqueCount, setUniqueCount] = useState<number>(0)
  const [processedCount, setProcessedCount] = useState<number>(0)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isMonitorRunning, setIsMonitorRunning] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)

  useEffect(() => {
    // Start the keyboard monitor when the app starts
    startKeyboardMonitor()
    
    // Cleanup when the app unmounts
    return () => {
      stopKeyboardMonitor()
    }
  }, [])

  const startKeyboardMonitor = async () => {
    try {
      await invoke('start_keyboard_monitor')
      setIsMonitorRunning(true)
      toast({
        title: "Success",
        description: "Keyboard monitor started successfully",
        duration: 3000,
      })
    } catch (error) {
      console.error('Failed to start keyboard monitor:', error)
      toast({
        title: "Error",
        description: "Failed to start keyboard monitor. Please run the app as administrator.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const stopKeyboardMonitor = async () => {
    try {
      await invoke('stop_keyboard_monitor')
      setIsMonitorRunning(false)
      toast({
        title: "Success",
        description: "Keyboard monitor stopped successfully",
        duration: 3000,
      })
    } catch (error) {
      console.error('Failed to stop keyboard monitor:', error)
      toast({
        title: "Error",
        description: "Failed to stop keyboard monitor",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Load the log file data
  useEffect(() => {
    const loadLogFile = async () => {
      try {
        // Try to read the log file from the project root
        const logContent = await readTextFile('logs/processed_numbers.txt');
        const entries = logContent.split('\n').filter(line => line.trim());
        setLogEntries(entries);
        setProcessedCount(entries.length);
        console.log('Loaded log entries:', entries);
      } catch (error) {
        console.error('Error loading log file:', error);
        setLogEntries([]);
        setProcessedCount(0);
      }
    };

    // Load log file initially
    loadLogFile();

    // Set up an interval to check for updates
    const interval = setInterval(loadLogFile, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const handleCsvUpload = (file: File) => {
    setCsvFilename(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = text.split("\n").map((row) => row.split(","))
      setCsvData(rows)

      // Calculate unique phone numbers (excluding header row)
      const phoneColumnIndex = rows[0].findIndex(
        (header) => header.toLowerCase().trim() === phoneColumn.toLowerCase().trim(),
      )

      if (phoneColumnIndex !== -1) {
        const uniquePhones = new Set()
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][phoneColumnIndex]?.trim()) {
            uniquePhones.add(rows[i][phoneColumnIndex].trim())
          }
        }
        setUniqueCount(uniquePhones.size)
      }

      toast({
        title: "CSV File Uploaded",
        description: `Successfully loaded contacts from ${file.name}`,
        duration: 3000,
      })
    }
    reader.readAsText(file)
  }

  const handleScriptUpload = (file: File) => {
    setScriptFilename(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setScriptText(text)
      toast({
        title: "Script File Uploaded",
        description: `Successfully loaded message template from ${file.name}`,
        duration: 3000,
      })
    }
    reader.readAsText(file)
  }

  const pasteNextPhone = async () => {
    if (csvData.length <= 1) {
      toast({
        title: "No Contacts Available",
        description: "Please upload a CSV file with contacts first",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      // Create temporary CSV file
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      await writeTextFile('contacts.csv', csvContent);
      
      // Create log file if it doesn't exist
      await writeTextFile('logs/processed_numbers.txt', '');
      
      const result = await getNextPhone('contacts.csv', 'logs/processed_numbers.txt', phoneColumn, currentIndex);

      if (result.status === 'error') {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      if (result.status === 'complete') {
        toast({
          title: "Campaign Complete",
          description: "All unique contacts have been processed",
          duration: 3000,
        });
        return;
      }

      // Update state with new values
      if (result.phone) {
        const newLogEntries = [...logEntries, result.phone];
        setLogEntries(newLogEntries);
        setProcessedCount(result.processed_contacts || newLogEntries.length);
        setCurrentIndex(result.next_index || 0);

        toast({
          title: "Phone Number Copied",
          description: `Copied: ${result.phone}`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to process next contact",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleMessagePaste = async () => {
    if (!scriptText) {
      toast({
        title: "No Message Template",
        description: "Please upload a message template file first",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    try {
      // Save message to temp file
      await writeTextFile('message.txt', scriptText)
      const result = await pasteMessage('message.txt')

      if (result.status === 'error') {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      toast({
        title: "Message Copied",
        description: "Message template copied to clipboard",
        duration: 3000,
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Failed to copy message template",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-500 to-pink-600 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 bg-white rounded-lg shadow-lg">
          <PythonTest />
        </div>

        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-40 h-40 md:w-52 md:h-52 relative mb-4">
            <Image
              src="/images/autodeck_logo_transparent.png"
              alt="AutoDeck Logo"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
          <p className="text-white text-center max-w-2xl text-shadow font-medium text-xl">
            Time to rock and roll you legend
          </p>
        </div>

        {/* Status Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white border-4 border-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-yellow-300 rounded-full p-2">
                <FileSpreadsheet className="h-5 w-5 text-black" />
              </div>
              <div>
                <p className="text-sm text-black font-bold">Contacts</p>
                <p className="text-xl font-black text-red-600">{uniqueCount} Contacts</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-4 border-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-yellow-300 rounded-full p-2">
                <Clock className="h-5 w-5 text-black" />
              </div>
              <div>
                <p className="text-sm text-black font-bold">Progress</p>
                <p className="text-xl font-black text-red-600">
                  {uniqueCount > 0 ? Math.round((processedCount / uniqueCount) * 100) : 0}% complete
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-4 border-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-yellow-300 rounded-full p-2">
                <MessageSquare className="h-5 w-5 text-black" />
              </div>
              <div>
                <p className="text-sm text-black font-bold">Messages Sent</p>
                <p className="text-xl font-black text-red-600">{processedCount} Sent</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CSV Upload Section */}
          <Card className="bg-white border-4 border-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
            <CardHeader className="bg-yellow-300 rounded-t-sm border-b-4 border-yellow-400">
              <CardTitle className="flex items-center gap-2 text-black font-black">
                <Upload className="h-5 w-5" />
                Contact List (CSV)
              </CardTitle>
              <CardDescription className="text-black font-medium">
                Drag and drop your CSV file with contacts
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FileUploader
                onFileUpload={handleCsvUpload}
                acceptedFileTypes=".csv"
                currentFilename={csvFilename}
                icon={<FileText className="h-12 w-12 text-red-500" />}
                label="Drop your CSV file here"
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setCsvData([])
                  setCsvFilename("")
                  setUniqueCount(0)
                }}
                disabled={!csvFilename}
                className="border-2 border-black font-bold"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={pasteNextPhone}
                      disabled={csvData.length <= 1}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Paste Next Contact (Ctrl+Alt+1)
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Simulates pressing Ctrl+Alt+1</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardFooter>
          </Card>

          {/* Script Upload Section */}
          <Card className="bg-white border-4 border-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
            <CardHeader className="bg-yellow-300 rounded-t-sm border-b-4 border-yellow-400">
              <CardTitle className="flex items-center gap-2 text-black font-black">
                <Upload className="h-5 w-5" />
                Message Template
              </CardTitle>
              <CardDescription className="text-black font-medium">
                Drag and drop your message template file
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FileUploader
                onFileUpload={handleScriptUpload}
                acceptedFileTypes=".txt"
                currentFilename={scriptFilename}
                icon={<FileText className="h-12 w-12 text-red-500" />}
                label="Drop your message template here"
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setScriptText("")
                  setScriptFilename("")
                }}
                disabled={!scriptFilename}
                className="border-2 border-black font-bold"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleMessagePaste}
                      disabled={!scriptText}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Paste Message (Ctrl+Alt+2)
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Simulates pressing Ctrl+Alt+2</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardFooter>
          </Card>
        </div>

        {/* Data Preview Section */}
        <div className="mt-8">
          <Tabs defaultValue="contacts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 bg-yellow-300 p-1 rounded-md border-2 border-black">
              <TabsTrigger
                value="contacts"
                className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] rounded-sm font-bold text-black"
              >
                Contact Preview
              </TabsTrigger>
              <TabsTrigger
                value="script"
                className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] rounded-sm font-bold text-black"
              >
                Message Preview
              </TabsTrigger>
              <TabsTrigger
                value="log"
                className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] rounded-sm font-bold text-black"
              >
                Paste Log
              </TabsTrigger>
            </TabsList>
            <TabsContent value="contacts">
              <Card className="bg-white border-4 border-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
                <CardHeader className="bg-yellow-300 rounded-t-sm border-b-4 border-yellow-400">
                  <CardTitle className="text-black font-black">Contact Data Preview</CardTitle>
                  <CardDescription className="text-black font-medium">
                    {csvData.length > 0
                      ? `Showing ${Math.min(10, csvData.length - 1)} of ${csvData.length - 1} contacts`
                      : "No data to display. Upload a CSV file to see preview."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <DataDisplay data={csvData} phoneColumn={phoneColumn} processedNumbers={logEntries} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="script">
              <Card className="bg-white border-4 border-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
                <CardHeader className="bg-yellow-300 rounded-t-sm border-b-4 border-yellow-400">
                  <CardTitle className="text-black font-black">Message Template Preview</CardTitle>
                  <CardDescription className="text-black font-medium">
                    {scriptText
                      ? `Showing message template (${scriptText.length} characters)`
                      : "No message template to display. Upload a text file to see preview."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ScriptDisplay text={scriptText} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="log">
              <Card className="bg-white border-4 border-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
                <CardHeader className="bg-yellow-300 rounded-t-sm border-b-4 border-yellow-400">
                  <CardTitle className="text-black font-black">Paste Log</CardTitle>
                  <CardDescription className="text-black font-medium">
                    {logEntries.length > 0
                      ? `Showing ${logEntries.length} processed contacts`
                      : "No contacts have been processed yet."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <LogDisplay entries={logEntries} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={pasteNextPhone}
            disabled={csvData.length <= 1}
            className="bg-yellow-300 hover:bg-yellow-400 text-black font-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transition-transform active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
          >
            <Keyboard className="h-5 w-5 mr-2" />
            Paste Next Contact (Ctrl+Alt+1)
          </Button>
          <Button
            size="lg"
            onClick={handleMessagePaste}
            disabled={!scriptText}
            className="bg-yellow-300 hover:bg-yellow-400 text-black font-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transition-transform active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
          >
            <Keyboard className="h-5 w-5 mr-2" />
            Paste Message (Ctrl+Alt+2)
          </Button>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Keyboard Monitor Status</h2>
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${isMonitorRunning ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isMonitorRunning ? 'Running' : 'Stopped'}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
