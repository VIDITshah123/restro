import numpy as np
import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler

class Recommender:
    def __init__(self, get_db):
        self.get_db = get_db
        self.matrix = None
        self.item_index = {}
        self.build_matrix()
        
        self.scheduler = BackgroundScheduler()
        self.scheduler.add_job(self.build_matrix, 'interval', minutes=30)
        self.scheduler.start()

    def build_matrix(self):
        conn = self.get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT oi.order_id, oi.menu_item_id
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status = 'served'
        """)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            self.matrix = None
            return

        df = pd.DataFrame(rows, columns=['order_id', 'item_id'])
        unique_items = sorted(df['item_id'].unique())
        self.item_index = {item: idx for idx, item in enumerate(unique_items)}
        
        n = len(unique_items)
        matrix = np.zeros((n, n), dtype=int)

        for _, group in df.groupby('order_id'):
            items = group['item_id'].tolist()
            for i in range(len(items)):
                for j in range(len(items)):
                    if i != j:
                        xi = self.item_index[items[i]]
                        xj = self.item_index[items[j]]
                        matrix[xi][xj] += 1

        self.matrix = matrix

    def get_similar(self, cart_item_ids, exclude=[], top_n=3):
        if self.matrix is None:
            return self.fallback(top_n, exclude)
            
        scores = np.zeros(len(self.item_index))
        for item_id in cart_item_ids:
            if item_id in self.item_index:
                idx = self.item_index[item_id]
                scores += self.matrix[idx]
                
        # Zero out cart items and excluded items
        for item_id in cart_item_ids + exclude:
            if item_id in self.item_index:
                scores[self.item_index[item_id]] = 0
                
        top_indices = np.argsort(scores)[::-1][:top_n]
        index_to_item = {v: k for k, v in self.item_index.items()}
        return [index_to_item[i] for i in top_indices if scores[i] > 0]

    def frequently_ordered_with(self, item_ids, top_n=3):
        return self.get_similar(item_ids, exclude=item_ids, top_n=top_n)

    def trending_today(self, top_n=5):
        conn = self.get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT oi.menu_item_id, SUM(oi.quantity) as total
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.placed_at >= datetime('now', '-24 hours')
            GROUP BY oi.menu_item_id
            ORDER BY total DESC
            LIMIT ?
        """, (top_n,))
        rows = cursor.fetchall()
        conn.close()
        return [row['menu_item_id'] for row in rows]

    def fallback(self, top_n, exclude=[]):
        conn = self.get_db()
        cursor = conn.cursor()
        placeholders = ','.join('?' for _ in exclude)
        query = f"""
            SELECT menu_item_id, SUM(quantity) as total
            FROM order_items
            {f"WHERE menu_item_id NOT IN ({placeholders})" if exclude else ""}
            GROUP BY menu_item_id
            ORDER BY total DESC LIMIT ?
        """
        params = tuple(exclude) + (top_n,) if exclude else (top_n,)
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [row['menu_item_id'] for row in rows]
