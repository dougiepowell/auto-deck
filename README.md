# AutoDeck v1

An automated contact management and messaging tool.

## Prerequisites

1. Python 3.8 or higher
2. Required Python packages (will be installed automatically):
   - keyboard
   - pyperclip

## Installation

1. Download and run the installer (AutoDeck_v1_Setup.exe)
2. Follow the installation wizard
3. Launch AutoDeck v1 from your Start Menu or Desktop shortcut

## Usage

1. Upload your contacts CSV file (must have a 'phone' column)
2. Upload your message template
3. Use the following hotkeys:
   - Ctrl+Alt+1: Paste next contact
   - Ctrl+Alt+2: Paste message template

## Important Notes

- The application requires Python to be installed on your system
- On first run, it will automatically install required Python packages
- Make sure your CSV file has a column named 'phone' (case insensitive)
- The application keeps track of processed contacts to avoid duplicates

## Support

If you encounter any issues:
1. Make sure Python is installed and in your system PATH
2. Check that your CSV file is properly formatted
3. Ensure you have the necessary permissions for clipboard operations

## Security

- All data is processed locally on your machine
- No data is sent to external servers
- Files are stored in temporary directories and cleaned up automatically 