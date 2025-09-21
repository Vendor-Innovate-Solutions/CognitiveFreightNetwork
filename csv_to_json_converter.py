import csv
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

def convert_value(value: Optional[str]) -> Any:
    """
    Best-effort conversion of CSV string values into native Python types.
    - Integers (e.g., "42") -> int
    - Floats (e.g., "3.14", "1e-5") -> float
    - Booleans: true/false/yes/no (case-insensitive) -> bool
    - Empty string remains "" (preserve explicit empties)
    - "null"/"none" (case-insensitive) -> None

    Otherwise, returns the original string.
    """
    if value is None:
        return None

    s = value.strip()
    if s == "":
        return ""  # preserve empty as empty string

    lower = s.lower()
    if lower in {"null", "none"}:
        return None
    if lower in {"true", "yes"}:
        return True
    if lower in {"false", "no"}:
        return False

    # Try int
    try:
        if not any(ch in s for ch in ".eE+"):  # quick path to avoid floaty ints
            return int(s)
    except ValueError:
        pass

    # Try float
    try:
        return float(s)
    except ValueError:
        pass

    return value

def csv_to_json(csv_file_path: str, json_file_path: Optional[str] = None, indent: int = 4) -> None:
    """
    Convert a CSV file to a JSON file.
    
    Args:
        csv_file_path (str): Path to the input CSV file
        json_file_path (str, optional): Path to save the output JSON file. 
                                          If not provided, will use the same name as CSV with .json extension
        indent (int, optional): Indentation level for the output JSON. Defaults to 4.
    
    Returns:
        None: Writes the JSON output to the specified file
    """
    # If no output path is provided, create one based on input filename
    if json_file_path is None:
        json_file_path = str(Path(csv_file_path).with_suffix('.json'))
    
    try:
        # Stream CSV rows and write JSON incrementally to avoid high memory usage
        total_records = 0
        with open(csv_file_path, mode='r', newline='', encoding='utf-8') as csv_file, \
             open(json_file_path, 'w', encoding='utf-8') as json_file:
            reader = csv.DictReader(csv_file)

            # Begin JSON array
            json_file.write('[')
            first = True

            for row in reader:
                # Convert row values
                converted = {k: convert_value(v) for k, v in row.items()}

                # Write comma and optional newline/indentation between items
                if first:
                    first = False
                    if indent and indent > 0:
                        json_file.write('\n' + ' ' * indent)
                else:
                    if indent and indent > 0:
                        json_file.write(',\n' + ' ' * indent)
                    else:
                        json_file.write(',')

                json.dump(converted, json_file, ensure_ascii=False)
                total_records += 1

            # End JSON array with optional trailing newline for pretty formatting
            if not first and indent and indent > 0:
                json_file.write('\n')
            json_file.write(']')

        print(f"Successfully converted {csv_file_path} to {json_file_path}")
        print(f"Total records converted: {total_records}")
        
    except FileNotFoundError:
        print(f"Error: The file {csv_file_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")

def main():
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description='Convert CSV to JSON')
    parser.add_argument('input_csv', help='Path to the input CSV file')
    parser.add_argument('-o', '--output', help='Path to the output JSON file (optional)')
    parser.add_argument('--indent', type=int, default=4, 
                       help='Indentation level for JSON output (default: 4)')
    
    args = parser.parse_args()
    
    # Perform the conversion
    csv_to_json(args.input_csv, args.output, args.indent)

if __name__ == "__main__":
    main()
