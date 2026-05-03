import numpy as np
import pandas as pd

class PeakHourPredictor:
    def __init__(self, get_db):
        self.get_db = get_db

    def predict(self):
        conn = self.get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
              strftime('%w', placed_at) as dow,
              CAST(strftime('%H', placed_at) AS INT) as hour,
              COUNT(*) as count,
              CAST((julianday('now') - julianday(placed_at)) / 7 AS INT) as weeks_ago
            FROM orders
            WHERE placed_at >= datetime('now', '-12 weeks')
            GROUP BY dow, hour, weeks_ago
        """)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return [0, 0, 0, 0, 0, 0, 0, 2, 5, 8, 15, 20, 25, 22, 15, 10, 8, 12, 18, 25, 30, 20, 10, 2]

        df = pd.DataFrame([dict(r) for r in rows])
        today_dow = str(pd.Timestamp.now().dayofweek + 1) # pandas 0=Mon, sqlite strftime('%w') 0=Sun.
        # Fix dow: pandas dayofweek gives Mon=0, Sun=6. SQLite %w gives Sun=0, Sat=6.
        # So we convert pandas to sqlite's format
        current_dow_sqlite = str((pd.Timestamp.now().dayofweek + 1) % 7)

        day_df = df[df['dow'] == current_dow_sqlite].copy()
        if day_df.empty:
            return [0, 0, 0, 0, 0, 0, 0, 2, 5, 8, 15, 20, 25, 22, 15, 10, 8, 12, 18, 25, 30, 20, 10, 2]

        lambda_ = 0.3
        day_df['weight'] = np.exp(-lambda_ * day_df['weeks_ago'])
        day_df['weighted_count'] = day_df['count'] * day_df['weight']

        result = day_df.groupby('hour').apply(
            lambda g: g['weighted_count'].sum() / g['weight'].sum()
        ).reindex(range(24), fill_value=0)

        return result.round(2).tolist()
