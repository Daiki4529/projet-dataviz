import csv
import json
import os

def csv_to_json(csv_file, json_file):
    data = []
    
    # Read CSV and convert to JSON
    with open(csv_file, mode='r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            data.append(row)

    # Save JSON file
    with open(json_file, mode='w', encoding='utf-8') as file:
        json.dump(data, file, indent=4)

    print(f"✅ Successfully converted '{csv_file}' to '{json_file}'")


if __name__ == "__main__":
    # Define the file paths
    input_csv = "Cyberattacks Detection.csv"  # Change this to your CSV filename
    output_json = os.path.splitext(input_csv)[0] + ".json"  # Same name, .json extension

    # Convert CSV to JSON
    csv_to_json(input_csv, output_json)
