import keyboard
import logging
import json
import os
import sys
import ctypes
from pathlib import Path
import pyperclip
import csv
import time
import psutil

# Add debouncing variables
last_phone_paste_time = 0
last_message_paste_time = 0
DEBOUNCE_INTERVAL = 1.0  # 1000ms debounce interval (increased from 0.5s)


def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except Exception:
        return False


def is_already_running() -> bool:
    """Return True if another keyboard_monitor.py process is running."""
    current_pid = psutil.Process().pid

    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info.get('cmdline', []) or []
            is_same_script = any(
                'keyboard_monitor.py' in (cmd or '')
                for cmd in cmdline
            )

            if (
                proc.info.get('name') == 'python.exe'
                and proc.info.get('pid') != current_pid
                and is_same_script
            ):
                return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    return False


# --- Logging setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(
            os.path.join(
                os.path.dirname(__file__),
                'keyboard_monitor.log'
            )
        ),
        logging.StreamHandler()
    ]
)

# Check for admin privileges
if not is_admin():
    logging.error("Script must be run with administrator privileges")
    sys.exit(1)

# Check if another instance is running
if is_already_running():
    logging.error(
        "Another monitor instance is running"
    )
    sys.exit(1)

logging.info("Script running with administrator privileges")


def resolve_path(path: str) -> str:
    """Convert relative path to absolute path."""
    try:
        # First try to resolve relative to the script's directory
        script_dir = Path(__file__).parent.parent.parent
        resolved_path = (script_dir / path).resolve()
        
        # If the file doesn't exist, try the current working directory
        if not resolved_path.exists():
            cwd = Path.cwd()
            resolved_path = (cwd / path).resolve()
        
        logging.info(f"Resolved path {path} to {resolved_path}")
        return str(resolved_path)
    except Exception as e:
        logging.error(f"Error resolving path {path}: {str(e)}")
        return path


def paste_text(text: str):
    """Copies text to clipboard and pastes it."""
    try:
        logging.info(f"Attempting to copy text to clipboard: {text[:50]}...")
        pyperclip.copy(text)
        logging.info("Text copied to clipboard successfully")
        
        # Add a longer delay to ensure clipboard is ready
        time.sleep(0.5)  # 500ms delay (increased from 0.1s)
        
        logging.info("Attempting to simulate Ctrl+V")
        keyboard.press_and_release('ctrl+v')
        logging.info("Ctrl+V simulated successfully")
        return True
    except Exception as e:
        logging.error(f"Error in paste_text: {str(e)}")
        return False


def get_next_phone(
    csv_path: str,
    log_path: str,
    phone_column: str = 'phone',
    current_index: int = 0
):
    """Get the next available phone number."""
    try:
        csv_path = resolve_path(csv_path)
        log_path = resolve_path(log_path)
        
        logging.info(f"Looking for CSV file at: {csv_path}")
        if not os.path.isfile(csv_path):
            logging.error(f"CSV file not found at {csv_path}")
            return None

        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            contacts = [
                row.get(phone_column, '').strip()
                for row in reader
                if row.get(phone_column, '').strip()
            ]

        if not contacts:
            logging.error("No contacts found in CSV")
            return None

        logging.info(f"Found {len(contacts)} contacts in CSV")

        # Get processed numbers
        processed_numbers = set()
        if os.path.isfile(log_path):
            with open(log_path, 'r', encoding='utf-8') as f:
                processed_numbers = {
                    line.strip() for line in f if line.strip()
                }
            logging.info(f"Found {len(processed_numbers)} processed numbers")

        # Find next unprocessed number
        for i in range(len(contacts)):
            index = (current_index + i) % len(contacts)
            phone = contacts[index]
            if phone and phone not in processed_numbers:
                # Log the number
                try:
                    with open(log_path, 'a', encoding='utf-8') as f:
                        f.write(f"{phone}\n")
                        f.flush()  # Ensure the write is completed
                    logging.info(
                        f"Successfully wrote phone number to log: "
                        f"{phone}"
                    )
                except Exception as e:
                    logging.error(f"Failed to write to log file: {str(e)}")
                logging.info(f"Selected phone number: {phone}")
                return phone

        logging.info("All contacts have been processed")
        return None

    except Exception as e:
        logging.error(f"Error in get_next_phone: {str(e)}")
        return None


def paste_message(message_path: str):
    """Read and paste the message from the specified file."""
    try:
        message_path = resolve_path(message_path)
        logging.info(f"Looking for message file at: {message_path}")
        
        if not os.path.isfile(message_path):
            logging.error(f"Message file not found at {message_path}")
            return False

        with open(message_path, 'r', encoding='utf-8') as f:
            msg = f.read().strip()

        if not msg:
            logging.error(f"Message file {message_path} is empty")
            return False

        logging.info(f"Found message with length: {len(msg)}")
        return paste_text(msg)

    except Exception as e:
        logging.error(f"Error in paste_message: {str(e)}")
        return False


def main():
    logging.info("Starting keyboard monitor...")
    
    # Get the script's directory
    script_dir = Path(__file__).parent.parent.parent
    logging.info(f"Script directory: {script_dir}")
    
    # Load configuration
    config_path = script_dir / 'config.json'
    logging.info(f"Looking for config file at: {config_path}")
    
    if not config_path.exists():
        logging.error(f"Configuration file not found at {config_path}")
        return

    with open(config_path, 'r') as f:
        config = json.load(f)

    csv_path = config.get('csv_path')
    log_path = config.get('log_path')
    message_path = config.get('message_path')
    phone_column = config.get('phone_column', 'phone')
    current_index = config.get('current_index', 0)
    log_dir = config.get('log_dir', 'logs')

    # Create log directory in the script's directory
    log_dir_path = script_dir / log_dir
    try:
        log_dir_path.mkdir(exist_ok=True)
        logging.info(f"Ensured log directory exists at {log_dir_path}")
    except Exception as e:
        logging.error(f"Failed to create log directory: {str(e)}")
        return

    # Update log path to be in the log directory
    log_path = log_dir_path / log_path
    logging.info(f"Using log file at: {log_path}")

    # Create empty log file if it doesn't exist
    if not log_path.exists():
        try:
            log_path.touch()
            logging.info(f"Created new log file at {log_path}")
        except Exception as e:
            logging.error(f"Failed to create log file: {str(e)}")
            return

    # Update other paths to be relative to script directory
    csv_path = str(script_dir / csv_path)
    message_path = str(script_dir / message_path)
    log_path = str(log_path)

    logging.info(
        f"Loaded configuration: CSV={csv_path}, "
        f"Log={log_path}, Message={message_path}"
    )

    if not all([csv_path, log_path, message_path]):
        logging.error("Missing required configuration")
        return

    logging.info("Configuration loaded successfully")
    logging.info("Monitoring for Ctrl+Alt+1 and Ctrl+Alt+2")

    # Check if another instance is running
    if is_already_running():
        logging.error("Another instance of keyboard monitor is already running")
        sys.exit(1)
    
    logging.info(
        "No other instance running, proceeding to register "
        "hotkeys..."
    )
    
    # Register hotkeys
    keyboard.add_hotkey(
        'ctrl+alt+1',
        lambda: handle_phone_paste(
            csv_path,
            log_path,
            phone_column,
            current_index
        )
    )
    logging.info("Registered Ctrl+Alt+1 hotkey")
    
    keyboard.add_hotkey(
        'ctrl+alt+2',
        lambda: handle_message_paste(message_path)
    )
    logging.info("Registered Ctrl+Alt+2 hotkey")
    
    logging.info("Entering keyboard wait loop...")
    keyboard.wait()


def handle_phone_paste(csv_path, log_path, phone_column, current_index):
    """Handle Ctrl+Alt+1 press."""
    global last_phone_paste_time
    current_time = time.time()
    
    # Check if enough time has passed since last trigger
    if current_time - last_phone_paste_time < DEBOUNCE_INTERVAL:
        logging.info("Debouncing phone paste - ignoring duplicate trigger")
        return
        
    last_phone_paste_time = current_time
    logging.info("Ctrl+Alt+1 detected")
    phone = get_next_phone(csv_path, log_path, phone_column, current_index)
    if phone:
        paste_text(phone)
        logging.info(f"Pasted phone number: {phone}")
    else:
        logging.info("No more phone numbers to paste")


def handle_message_paste(message_path):
    """Handle Ctrl+Alt+2 press."""
    global last_message_paste_time
    current_time = time.time()
    
    # Check if enough time has passed since last trigger
    if current_time - last_message_paste_time < DEBOUNCE_INTERVAL:
        logging.info("Debouncing message paste - ignoring duplicate trigger")
        return
        
    last_message_paste_time = current_time
    logging.info("Ctrl+Alt+2 detected")
    if paste_message(message_path):
        logging.info("Message pasted successfully")
    else:
        logging.error("Failed to paste message")


if __name__ == '__main__':
    main()
