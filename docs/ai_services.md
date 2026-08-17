# 🧠 AI Service Documentation

The `ai-service` is a microservice built with **Python** and **Flask** that runs in parallel with the main Node.js application server. Its core purpose is to provide real-time smart recommendations and predictive analytics for the restaurant management and customer ordering systems.

---

## 🛠️ Technology Stack & Dependencies

The dependencies are specified in [requirements.txt](file:///c:/Users/shahv/OneDrive/Desktop/restro/ai-service/requirements.txt):

1. **Flask**: A lightweight Web Server Gateway Interface (WSGI) web application framework used to expose REST API endpoints.
2. **NumPy**: A high-performance mathematical computing library used for matrix operations, vector aggregation, and data smoothing.
3. **Pandas**: A data analysis toolkit used to structure SQL query outputs into DataFrames for processing, grouping, and filtering.
4. **APScheduler**: Advanced Python Scheduler used to run background tasks (such as periodically rebuilding the recommendation matrix) without blocking web requests.
5. **SQLite3**: A built-in Python module used to query the restaurant's database.

---

## 📁 File Structure

The AI service consists of the following modules:

```text
ai-service/
├── venv/                 # Python Virtual Environment
├── requirements.txt      # Dependency List
├── db.py                 # SQLite read-only database connections
├── app.py                # Flask entry point and HTTP endpoints
├── recommender.py        # Item-to-item recommendation algorithms
└── predictor.py          # Peak-hour traffic forecasting algorithm
```

---

## 🔌 Core Components & Algorithms

### 1. Database Hook (`db.py`)
Provides safe, read-only access to the primary SQLite database of the restaurant.

* **File**: [db.py](file:///c:/Users/shahv/OneDrive/Desktop/restro/ai-service/db.py)
* **Design Pattern**: Connects using a URI read-only flag (`file:...restaurant.db?mode=ro`, `uri=True`) to ensure the AI service can never accidentally alter restaurant table data, orders, or billing.
* **Row Factory**: Employs `sqlite3.Row` to convert SQL tuples into dictionary-like objects, allowing column access by name in Pandas.

---

### 2. Recommendation Engine (`recommender.py`)
Computes dish-to-dish similarities based on historical customer purchase behaviors (Association Analysis / Collaborative Filtering).

* **File**: [recommender.py](file:///c:/Users/shahv/OneDrive/Desktop/restro/ai-service/recommender.py)
* **Co-Occurrence Matrix**:
  - Queries all served orders and maps which dishes are frequently ordered together.
  - Builds an $N \times N$ matrix (where $N$ is the number of unique dishes) to store correlation counts.
* **Smart Update Scheduler**: Uses `BackgroundScheduler` from `APScheduler` to run `build_matrix` every **30 minutes** in the background, updating recommendations automatically as new orders are completed without interrupting active users.
* **Recommendation Mechanics (`get_similar`)**:
  - Sums up the correlation vectors for all items currently in the user's cart.
  - Excludes items already in the cart or items ordered in the current session to avoid redundant suggestions.
  - Returns the top $N$ matching item IDs sorted in descending order of recommendation score.
* **Fallback mechanism**: If no orders exist or the co-occurrence matrix is empty, the engine falls back to recommending the globally most popular dishes (historical best sellers).

---

### 3. Traffic Forecasting (`predictor.py`)
Predicts kitchen order volumes for each hour of the day to help staff schedule prep times and anticipate busy periods.

* **File**: [predictor.py](file:///c:/Users/shahv/OneDrive/Desktop/restro/ai-service/predictor.py)
* **Historical Window**: Aggregates order data from the last **12 weeks**.
* **Exponential Time Decay**:
  - Orders placed in the current week have a higher impact on forecasting than older orders.
  - This is achieved using an exponential weight function:
    $$\text{weight} = e^{-\lambda \times \text{weeks\_ago}}$$
    where $\lambda = 0.3$.
* **Smoothing Filter**: To create a natural, smooth prediction curve on the admin chart, the algorithm applies a **three-hour moving average filter**:
  $$\text{Smoothed}_i = 0.2 \times \text{Volume}_{i-1} + 0.6 \times \text{Volume}_i + 0.2 \times \text{Volume}_{i+1}$$
  This smooths out random spikes or outliers.

---

## 📡 REST API Endpoints

The endpoints are defined in [app.py](file:///c:/Users/shahv/OneDrive/Desktop/restro/ai-service/app.py):

### 1. Item Recommendations
* **Endpoint**: `/ai/recommendations`
* **Method**: `POST`
* **JSON Body**:
  ```json
  {
    "cartItemIds": [10, 15],
    "sessionItemIds": [2, 5]
  }
  ```
* **Response**: Recommends similar dishes matching the user's current cart selection, excluding items they have already ordered.

---

### 2. Trending Dishes
* **Endpoint**: `/ai/trending`
* **Method**: `GET`
* **Response**: Top 5 dishes with the highest order volume in the last **24 hours**.

---

### 3. Frequently Bought Together
* **Endpoint**: `/ai/frequently-with`
* **Method**: `GET`
* **Query Parameter**: `?items=10,12` (comma-separated list of item IDs)
* **Response**: Returns up to 3 dishes frequently ordered alongside the provided items.

---

### 4. Peak Hour Volume Prediction
* **Endpoint**: `/ai/peak-hours`
* **Method**: `GET`
* **Response**: A list of 24 floating-point values representing predicted order volume scaling factors for each hour of the day (00:00 to 23:00) for the current day of the week.
