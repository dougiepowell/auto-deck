import { useState } from 'react';
import { runPythonScript } from '@/lib/python';
import { Button } from '@/components/ui/button';

export function PythonTest() {
  const [result, setResult] = useState<string>('');

  const handleRunPython = async () => {
    try {
      const response = await runPythonScript('main.py', ['test-arg']);
      const data = JSON.parse(response);
      setResult(data.message);
    } catch (error) {
      console.error('Error:', error);
      setResult('Error running Python script');
    }
  };

  return (
    <div className="p-4">
      <Button onClick={handleRunPython}>Run Python Script</Button>
      <p className="mt-4">{result}</p>
    </div>
  );
} 