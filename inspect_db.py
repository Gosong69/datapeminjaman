import sqlite3
import json

def inspect_db():
    conn = sqlite3.connect('data_base.db')
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Tables: {tables}")
    
    for table in tables:
        print(f"\n--- Table: {table} ---")
        # Get schema
        cursor.execute(f"PRAGMA table_info({table});")
        columns = cursor.fetchall()
        print("Columns (id, name, type, notnull, dflt_value, pk):")
        for col in columns:
            print(f"  {col}")
            
        # Get count
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        count = cursor.fetchone()[0]
        print(f"Total rows: {count}")
        
        # Get sample rows
        cursor.execute(f"SELECT * FROM {table} LIMIT 5;")
        rows = cursor.fetchall()
        print("Sample data:")
        for row in rows:
            print(f"  {row}")
            
    conn.close()

if __name__ == '__main__':
    inspect_db()
