#!/usr/bin/env python3
"""
phone_sender.py

Usage:
  python phone_sender.py next   # Copy next phone number to clipboard, mark it sent
  python phone_sender.py msg    # Copy the message template to clipboard

Dependencies:
  pip install pyperclip
"""

import csv
import os
import sys
import pyperclip

# -- Configuration ------------------------------------------------------------

# Auto-detect script directory so we can find the CSV files nearby.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PHONE_NUMBERS_FILE = os.path.join(BASE_DIR, 'phone_numbers.csv')
SENT_LOG_FILE      = os.path.join(BASE_DIR, 'sent_log.csv')

# Your message template
MESSAGE_TEMPLATE = """\
Hello! This is your pre-written Auto Deck message.
Feel free to edit this template in the script.
"""

# -----------------------------------------------------------------------------

def load_phone_numbers():
    if not os.path.isfile(PHONE_NUMBERS_FILE):
        print(f"ERROR: Phone numbers file not found: {PHONE_NUMBERS_FILE}", file=sys.stderr)
        sys.exit(1)
    with open(PHONE_NUMBERS_FILE, newline='', encoding='utf-8') as f:
        return [row[0].strip() for row in csv.reader(f) if row and row[0].strip()]

def load_sent_log():
    if not os.path.isfile(SENT_LOG_FILE):
        return set()
    with open(SENT_LOG_FILE, newline='', encoding='utf-8') as f:
        return {row[0].strip() for row in csv.reader(f) if row and row[0].strip()}

def update_sent_log(number: str):
    try:
        with open(SENT_LOG_FILE, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([number])
    except Exception as e:
        print(f"ERROR: Could not write to log {SENT_LOG_FILE}: {e}", file=sys.stderr)
        sys.exit(1)

def copy_next_number():
    numbers = load_phone_numbers()
    sent     = load_sent_log()

    for num in numbers:
        if num not in sent:
            pyperclip.copy(num)
            print(f"Copied to clipboard: {num}")
            update_sent_log(num)
            sys.exit(0)

    print("ERROR: All numbers have been sent or no valid numbers found.", file=sys.stderr)
    sys.exit(1)

def copy_message_template():
    pyperclip.copy(MESSAGE_TEMPLATE)
    print("Copied message template to clipboard.")
    sys.exit(0)

def print_usage():
    print("Usage:", file=sys.stderr)
    print("  python phone_sender.py next   # copy next number", file=sys.stderr)
    print("  python phone_sender.py msg    # copy message template", file=sys.stderr)
    sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print_usage()

    cmd = sys.argv[1].lower()
    if cmd == 'next':
        copy_next_number()
    elif cmd == 'msg':
        copy_message_template()
    else:
        print_usage()
