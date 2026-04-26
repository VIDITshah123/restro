import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'server', 'data', 'restaurant.db')

def get_db_connection():
    # URI with mode=ro for read-only
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn
