// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::process::Command;
use tauri::command;
use std::env;
use std::sync::Mutex;
use std::process::Child;
use sysinfo::{Process, System, ProcessRefreshKind, ProcessesToUpdate};
use std::ffi::OsStr;

#[derive(Default)]
struct KeyboardMonitor {
    process: Mutex<Option<Child>>,
}

#[command]
fn get_app_dir() -> Result<String, String> {
    let current_dir = env::current_dir().map_err(|e| e.to_string())?;
    // If we're in src-tauri during dev, move one level up to project root
    let workspace_root = current_dir
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or(current_dir);
    Ok(workspace_root.to_string_lossy().to_string())
}

#[command]
fn run_python_script(script_name: String, args: Vec<String>) -> Result<String, String> {
    // Get the workspace root directory (where the tauri.conf.json is located)
    let workspace_dir = env::current_dir().map_err(|e| e.to_string())?;
    let workspace_root = workspace_dir.parent().ok_or("Could not get workspace root")?;
    let script_path = workspace_root.join("python/scripts").join(script_name);
    
    println!("Workspace directory: {:?}", workspace_dir);
    println!("Workspace root: {:?}", workspace_root);
    println!("Attempting to run Python script at: {:?}", script_path);
    println!("With arguments: {:?}", args);
    
    // Try different Python commands with elevated privileges
    let python_commands = ["python", "python3", "py"];
    let mut last_error = None;
    
    for cmd in python_commands.iter() {
        let mut command = Command::new(cmd);
        command.arg(&script_path).args(&args);
        
        // On Windows, try to run with elevated privileges
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            // Use CREATE_NO_WINDOW to prevent console window
            command.creation_flags(0x08000000);
            
            // Try to run with elevated privileges
            if let Ok(output) = command.output() {
                if output.status.success() {
                    return String::from_utf8(output.stdout)
                        .map_err(|e| format!("Failed to parse Python output: {}", e));
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    println!("Python script error with {}: {}", cmd, error);
                    last_error = Some(format!("Python script failed with {}: {}", cmd, error));
                }
            } else {
                // If normal execution fails, try with elevated privileges
                let mut elevated_command = Command::new("powershell");
                elevated_command.args(&[
                    "-Command",
                    &format!(
                        "Start-Process {} -ArgumentList '{} {}' -Verb RunAs -WindowStyle Hidden",
                        cmd,
                        script_path.to_str().unwrap(),
                        args.join(" ")
                    ),
                ]);
                
                if let Ok(output) = elevated_command.output() {
                    if output.status.success() {
                        return String::from_utf8(output.stdout)
                            .map_err(|e| format!("Failed to parse Python output: {}", e));
                    }
                }
            }
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(output) = command.output() {
                if output.status.success() {
                    return String::from_utf8(output.stdout)
                        .map_err(|e| format!("Failed to parse Python output: {}", e));
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    println!("Python script error with {}: {}", cmd, error);
                    last_error = Some(format!("Python script failed with {}: {}", cmd, error));
                }
            }
        }
    }
    
    Err(last_error.unwrap_or_else(|| "All Python commands failed".to_string()))
}

#[tauri::command]
async fn start_keyboard_monitor(
    _app_handle: tauri::AppHandle,
    state: tauri::State<'_, KeyboardMonitor>,
) -> Result<(), String> {
    // Kill any old keyboard_monitor.py processes
    let mut system = System::new_all();
    system.refresh_processes_specifics(ProcessesToUpdate::All, true, ProcessRefreshKind::everything());
    let python_exe = OsStr::new("python.exe");
    for (pid, process) in system.processes() {
        if process.name() == python_exe {
            for cmd in process.cmd() {
                if let Some(cmd_str) = cmd.to_str() {
                    if cmd_str.contains("keyboard_monitor.py") {
                        let _ = process.kill();
                    }
                }
            }
        }
    }
    // Check if monitor is already running
    let process = state.process.lock().unwrap();
    if process.is_some() {
        return Ok(()); // Monitor is already running
    }
    drop(process); // Release the lock before starting new process

    // Get the workspace root directory
    let workspace_dir = env::current_dir().map_err(|e| e.to_string())?;
    let workspace_root = workspace_dir.parent().ok_or("Could not get workspace root")?;
    let script_path = workspace_root.join("python/scripts/keyboard_monitor.py");
    
    println!("Starting keyboard monitor from: {}", script_path.display());

    // Try different Python commands
    let python_commands = ["python", "python3", "py"];
    let mut last_error = None;

    for cmd in python_commands {
        if cfg!(target_os = "windows") {
            let mut powershell_cmd = Command::new("powershell");
            let command_str = format!(
                "Start-Process {} -ArgumentList '{}' -Verb RunAs -WindowStyle Hidden",
                cmd, script_path.to_string_lossy()
            );
            powershell_cmd.args(["-Command", &command_str]);

            match powershell_cmd.spawn() {
                Ok(child) => {
                    println!("Successfully started keyboard monitor with {}", cmd);
                    *state.process.lock().unwrap() = Some(child);
                    return Ok(());
                }
                Err(e) => {
                    println!("Failed to start with {}: {}", cmd, e);
                    last_error = Some(e);
                }
            }
        } else {
            let mut python_cmd = Command::new(cmd);
            python_cmd.arg(&script_path);

            match python_cmd.spawn() {
                Ok(child) => {
                    println!("Successfully started keyboard monitor with {}", cmd);
                    *state.process.lock().unwrap() = Some(child);
                    return Ok(());
                }
                Err(e) => {
                    println!("Failed to start with {}: {}", cmd, e);
                    last_error = Some(e);
                }
            }
        }
    }

    Err(format!(
        "Failed to start keyboard monitor: {}",
        last_error.unwrap_or_else(|| std::io::Error::new(
            std::io::ErrorKind::Other,
            "No Python command available"
        ))
    ))
}

#[tauri::command]
async fn stop_keyboard_monitor(state: tauri::State<'_, KeyboardMonitor>) -> Result<(), String> {
    let mut process = state.process.lock().unwrap();
    if let Some(mut child) = process.take() {
        println!("Stopping keyboard monitor...");
        if let Err(e) = child.kill() {
            println!("Error stopping keyboard monitor: {}", e);
            return Err(format!("Failed to stop keyboard monitor: {}", e));
        }
        println!("Keyboard monitor stopped successfully");
    }
    Ok(())
}

#[tauri::command]
fn clear_processed_numbers() -> Result<(), String> {
    // Determine workspace root (project root)
    let current_dir = env::current_dir().map_err(|e| e.to_string())?;
    let workspace_root = current_dir
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or(current_dir);

    let log_path = workspace_root.join("logs").join("processed_numbers.txt");

    // Ensure the logs directory exists
    if let Some(parent) = log_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Truncate (or create) the log file to clear its contents
    std::fs::write(&log_path, "").map_err(|e| e.to_string())?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(KeyboardMonitor {
            process: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            run_python_script,
            start_keyboard_monitor,
            stop_keyboard_monitor,
            get_app_dir,
            clear_processed_numbers
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
