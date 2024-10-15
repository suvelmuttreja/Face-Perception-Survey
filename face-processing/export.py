import os
import pandas as pd
from sqlalchemy import create_engine, inspect
import sys

def save_db_to_excel(db_uri, output_filename):
    # Create an SQLAlchemy engine
    engine = create_engine(db_uri)
    
    # Reflect the database tables
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    # Ensure the export directory exists
    export_folder = 'instance\export'
    os.makedirs(export_folder, exist_ok=True)
    
    # Construct the full output path
    output_path = os.path.join(export_folder, output_filename)

    # Export each table to a separate sheet in the Excel file
    with pd.ExcelWriter(output_path, engine='xlsxwriter') as writer:
        for table_name in table_names:
            query = f"SELECT * FROM {table_name}"
            df = pd.read_sql(query, engine)
            df.to_excel(writer, sheet_name=table_name, index=False)

    print(f"Database saved to {output_path}")

# Commented out JSON export function for now
# def save_db_to_json(db_uri, output_filename):
#     engine = create_engine(db_uri)
#     inspector = inspect(engine)
#     table_names = inspector.get_table_names()

#     db_data = {}
#     for table_name in table_names:
#         query = f"SELECT * FROM {table_name}"
#         df = pd.read_sql(query, engine)
#         db_data[table_name] = df.to_dict(orient='records')
    
#     with open(output_filename, 'w') as f:
#         json.dump(db_data, f, indent=4)

if __name__ == "__main__":
    # Default database URI
    db_uri = 'sqlite:///instance/app.db'

    # Get output filename from command-line arguments
    if len(sys.argv) != 2:
        print("Usage: python export.py <output_filename>.xlsx")
        sys.exit(1)
    
    output_filename = sys.argv[1]

    save_db_to_excel(db_uri, output_filename)
