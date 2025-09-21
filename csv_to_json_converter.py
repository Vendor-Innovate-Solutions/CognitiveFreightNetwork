import csv
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

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
        # Read CSV and convert to list of dictionaries
        with open(csv_file_path, mode='r', encoding='utf-8') as csv_file:
            # Read CSV using DictReader
            csv_reader = csv.DictReader(csv_file)
            # Convert to list of dictionaries
            data: List[Dict[str, Any]] = [row for row in csv_reader]
        
        # Write JSON file
        with open(json_file_path, 'w', encoding='utf-8') as json_file:
            json.dump(data, json_file, indent=indent, ensure_ascii=False)
            
        print(f"Successfully converted {csv_file_path} to {json_file_path}")
        print(f"Total records converted: {len(data)}")
        
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
