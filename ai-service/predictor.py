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
              strftime('%w', o.placed_at) as dow,
              CAST(strftime('%H', o.placed_at) AS INT) as hour,
              SUM(oi.quantity) as count,
              CAST((julianday('now') - julianday(o.placed_at)) / 7 AS INT) as weeks_ago
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.placed_at >= datetime('now', '-12 weeks') AND o.is_hidden = 0
            GROUP BY dow, hour, weeks_ago
        """)
        rows = cursor.fetchall()
        conn.close()

        default_curve = [0, 0, 0, 0, 0, 0, 0, 2, 5, 8, 15, 20, 25, 22, 15, 10, 8, 12, 18, 25, 30, 20, 10, 2]

        if not rows:
            return default_curve

        df = pd.DataFrame([dict(r) for r in rows])
        today_dow = str(pd.Timestamp.now().dayofweek + 1) # pandas 0=Mon, sqlite strftime('%w') 0=Sun.
        # Fix dow: pandas dayofweek gives Mon=0, Sun=6. SQLite %w gives Sun=0, Sat=6.
        # So we convert pandas to sqlite's format
        current_dow_sqlite = str((pd.Timestamp.now().dayofweek + 1) % 7)

        day_df = df[df['dow'] == current_dow_sqlite].copy()
        if day_df.empty:
            return default_curve

        lambda_ = 0.3
        day_df['weight'] = np.exp(-lambda_ * day_df['weeks_ago'])
        day_df['weighted_count'] = day_df['count'] * day_df['weight']

        raw_result = day_df.groupby('hour').apply(
            lambda g: g['weighted_count'].sum() / g['weight'].sum()
        ).reindex(range(24), fill_value=0)

        # Enhance: Apply moving average smoothing to the predictions for a more natural curve
        result_array = raw_result.values
        smoothed = np.zeros(24)
        for i in range(24):
            prev_i = (i - 1) % 24
            next_i = (i + 1) % 24
            smoothed[i] = (result_array[prev_i] * 0.2) + (result_array[i] * 0.6) + (result_array[next_i] * 0.2)

        return np.round(smoothed, 1).tolist()
