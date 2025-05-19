import { invoke } from '@tauri-apps/api/tauri';

export interface PhoneResult {
  status: 'success' | 'complete' | 'error';
  phone?: string;
  next_index?: number;
  total_contacts?: number;
  processed_contacts?: number;
  message?: string;
  error?: string;
}

export interface MessageResult {
  status: 'success' | 'error';
  message?: string;
  error?: string;
}

export async function runPythonScript(scriptName: string, args: string[]): Promise<string> {
  try {
    const result = await invoke('run_python_script', {
      scriptName,
      args,
    });
    return result as string;
  } catch (error) {
    console.error('Error running Python script:', error);
    throw error;
  }
}

export async function getNextPhone(
  csvPath: string,
  logPath: string,
  phoneColumn: string,
  currentIndex: number = 0
): Promise<PhoneResult> {
  try {
    console.log('Calling getNextPhone with:', {
      csvPath,
      logPath,
      phoneColumn,
      currentIndex
    });

    const result = await invoke('run_python_script', {
      scriptName: 'main.py',
      args: ['get_next_phone', csvPath, logPath, phoneColumn, currentIndex.toString()],
    });

    console.log('Python script result:', result);
    return JSON.parse(result as string) as PhoneResult;
  } catch (error) {
    console.error('Error running Python script:', error);
    return { status: 'error', error: String(error) };
  }
}

export async function pasteMessage(messagePath: string): Promise<MessageResult> {
  try {
    console.log('Calling pasteMessage with:', { messagePath });

    const result = await invoke('run_python_script', {
      scriptName: 'main.py',
      args: ['paste_message', messagePath],
    });

    console.log('Python script result:', result);
    return JSON.parse(result as string) as MessageResult;
  } catch (error) {
    console.error('Error running Python script:', error);
    return { status: 'error', error: String(error) };
  }
} 