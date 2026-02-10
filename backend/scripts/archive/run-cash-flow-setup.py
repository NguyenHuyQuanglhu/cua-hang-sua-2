#!/usr/bin/env python3
"""
Script to setup cash flow synchronization
Requires: pip install pymssql
"""

import pymssql
import sys

# Database configuration
DB_SERVER = '118.69.126.49'
DB_NAME = 'Data_quanlybanhang_online'
DB_USER = 'userquanlybanhangonline'
DB_PASSWORD = '123456789'
DB_PORT = 1433

def run_setup():
    try:
        print('Connecting to database...')
        print(f'Server: {DB_SERVER}')
        print(f'Database: {DB_NAME}')
        print('')
        
        # Connect to database
        conn = pymssql.connect(
            server=DB_SERVER,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT
        )
        
        print('✓ Connected successfully!')
        print('')
        
        cursor = conn.cursor()
        
        # Read SQL file
        with open('scripts/setup-cash-flow.sql', 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        # Split by GO statements
        sql_batches = [batch.strip() for batch in sql_script.split('GO') if batch.strip()]
        
        # Execute each batch
        for i, batch in enumerate(sql_batches, 1):
            if batch:
                try:
                    cursor.execute(batch)
                    conn.commit()
                    
                    # Print any messages
                    if cursor.messages:
                        for msg in cursor.messages:
                            print(msg[1])
                    
                except Exception as e:
                    print(f'Error in batch {i}: {e}')
                    conn.rollback()
        
        cursor.close()
        conn.close()
        
        print('')
        print('✓ Setup completed successfully!')
        return 0
        
    except Exception as e:
        print(f'Error: {e}')
        return 1

if __name__ == '__main__':
    sys.exit(run_setup())
