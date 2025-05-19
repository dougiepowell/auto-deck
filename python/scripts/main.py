# auto_paste_contact.py
# A script to load contacts from a CSV, paste the next unique phone number,
# and paste a message from a text file using clipboard paste.

import csv
import os
import json
import sys
import logging
import pyperclip
import keyboard
import time
import ctypes
from pathlib import Path

# --- Logging setup ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('autodeck.log'),
        logging.StreamHandler()
    ]
)

def is_admin():
    """Check if the script is running with admin privileges."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def resolve_path(path: str) -> str:
    """Convert relative path to absolute path."""
    try:
        # Get the script's directory
        script_dir = Path(__file__).parent.parent.parent
        # Resolve the path relative to the script's directory
        resolved_path = (script_dir / path).resolve()
        logging.info(f"Resolved path {path} to {resolved_path}")
        return str(resolved_path)
    except Exception as e:
        logging.error(f"Error resolving path {path}: {str(e)}")
        return path

def load_defined_numbers(log_path):
    """
    Read the log file fresh and return a set of all numbers already pasted.
    """
    if os.path.isfile(log_path):
        with open(log_path, 'r', encoding='utf-8') as f:
            return {line.strip() for line in f if line.strip()}
    else:
        # ensure the file exists
        open(log_path, 'a').close()
        return set()

def paste_text(text: str):
    """
    Copies `text` to the clipboard and pastes it (Ctrl+V) into the active window.
    """
    try:
        if not is_admin():
            logging.warning("Script is not running with admin privileges. Keyboard simulation may not work.")
            
        logging.info(f"Attempting to copy text to clipboard: {text[:50]}...")
        pyperclip.copy(text)
        logging.info("Text copied to clipboard successfully")
        
        logging.info("Attempting to simulate Ctrl+V")
        # Try multiple times to ensure the paste works
        for i in range(3):
            try:
                # Use a more reliable method for keyboard simulation
                keyboard.press_and_release('ctrl+v')
                logging.info(f"Ctrl+V simulated successfully (attempt {i+1})")
                time.sleep(0.1)  # Small delay between attempts
            except Exception as e:
                logging.error(f"Error on attempt {i+1}: {str(e)}")
                if i == 2:  # Last attempt
                    raise
        return True
    except Exception as e:
        logging.error(f"Error in paste_text: {str(e)}")
        return False

def get_next_phone(csv_path, log_path, phone_column='phone', current_index=0):
    """
    Get the next available phone number that hasn't been processed.
    """
    try:
        # Resolve paths
        csv_path = resolve_path(csv_path)
        log_path = resolve_path(log_path)
        
        logging.info(f"Getting next phone from {csv_path} with column {phone_column}")
        # Load and validate CSV
        if not os.path.isfile(csv_path):
            logging.error(f"CSV file not found at {csv_path}")
            return {"error": f"CSV file not found at {csv_path}"}

        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            headers = reader.fieldnames or []
            header_map = {h.strip().lower(): h for h in headers}
            phone_key = header_map.get(phone_column.lower())
            
            if not phone_key:
                logging.error(f"Could not find phone column: {phone_column}")
                return {"error": f"Could not find a '{phone_column}' column in CSV headers: {headers}"}

            # Get all contacts
            contacts = [row.get(phone_key, '').strip() for row in reader]

        if not contacts:
            logging.error("No contacts found in CSV")
            return {"error": "No contacts found in CSV."}

        # Get processed numbers
        defined_numbers = load_defined_numbers(log_path)
        unique_contacts = {c for c in contacts if c}

        if defined_numbers >= unique_contacts:
            logging.info("All contacts have been processed")
            return {"status": "complete", "message": "All contacts have been processed"}

        # Find next unprocessed number
        total = len(contacts)
        index = current_index
        candidate = None

        for _ in range(total):
            val = contacts[index]
            if val and val not in defined_numbers:
                candidate = val
                break
            index = (index + 1) % total

        if not candidate:
            logging.error("No new phone number found")
            return {"error": "No new phone number found. Check CSV and log."}

        # Log the number
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(candidate + '\n')

        logging.info(f"Found next phone number: {candidate}")
        return {
            "status": "success",
            "phone": candidate,
            "next_index": (index + 1) % total,
            "total_contacts": len(contacts),
            "processed_contacts": len(defined_numbers) + 1
        }

    except Exception as e:
        logging.error(f"Error in get_next_phone: {str(e)}")
        return {"error": str(e)}

def paste_message(message_path):
    """
    Read and paste the message from the specified file.
    """
    try:
        # Resolve path
        message_path = resolve_path(message_path)
        
        if not os.path.isfile(message_path):
            return {"error": f"Message file not found at {message_path}"}

        with open(message_path, 'r', encoding='utf-8') as f:
            msg = f.read().strip()

        if not msg:
            return {"error": f"Message file {message_path} is empty."}

        paste_text(msg)
        return {"status": "success", "message": "Message pasted successfully"}

    except Exception as e:
        return {"error": str(e)}

def main():
    # Parse command line arguments
    args = sys.argv[1:]
    
    logging.info(f"Script started with arguments: {args}")
    
    if not args:
        logging.error("No command specified")
        print(json.dumps({"error": "No command specified"}))
        return

    command = args[0]
    logging.info(f"Executing command: {command}")

    if command == "get_next_phone":
        if len(args) < 4:
            logging.error("Missing required arguments for get_next_phone")
            print(json.dumps({"error": "Missing required arguments for get_next_phone"}))
            return
        result = get_next_phone(args[1], args[2], args[3], int(args[4]) if len(args) > 4 else 0)
        print(json.dumps(result))

    elif command == "paste_message":
        if len(args) < 2:
            logging.error("Missing message path argument")
            print(json.dumps({"error": "Missing message path argument"}))
            return
        result = paste_message(args[1])
        print(json.dumps(result))

    else:
        logging.error(f"Unknown command: {command}")
        print(json.dumps({"error": f"Unknown command: {command}"}))

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        logging.error(f"Unhandled exception: {str(e)}")
        print(json.dumps({"error": f"Unhandled exception: {str(e)}"}))
