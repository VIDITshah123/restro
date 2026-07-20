#!/bin/bash
# Exit immediately if any command exits with a non-zero status
set -e

echo "🚀 Starting automated deployment to AWS EC2..."

# Navigate to the repository root directory
cd /home/ubuntu/restro

# Fetch and reset the working directory to match the remote main branch
echo "📦 Fetching latest changes from main..."
git fetch origin main
git reset --hard origin/main
# NOTE: restaurant.db is in .gitignore so git reset --hard NEVER deletes it.
# The live database at server/data/restaurant.db is preserved automatically.

# 1. Ensure the data directory exists
mkdir -p server/data

# Fail-safe: Restore from safe backup if current DB is missing or has fewer than 10 items
DB_LIVE="server/data/restaurant.db"
DB_SAFE_BACKUP="/tmp/safe_backup_135.db"

if [ -f "$DB_SAFE_BACKUP" ]; then
  # Count items in live database if it exists
  ITEM_COUNT=0
  if [ -f "$DB_LIVE" ]; then
    ITEM_COUNT=$(sqlite3 "$DB_LIVE" "SELECT COUNT(*) FROM menu_items;" 2>/dev/null || echo 0)
  fi
  
  if [ "$ITEM_COUNT" -lt 10 ]; then
    echo "⚠️ Live DB has only $ITEM_COUNT items. Restoring 135-item database from safe backup..."
    # Clean up lock files to prevent SQLite conflicts
    rm -f "${DB_LIVE}-wal" "${DB_LIVE}-shm"
    cp "$DB_SAFE_BACKUP" "$DB_LIVE"
    echo "✅ Database restored successfully."
  else
    echo "ℹ️ Live DB is healthy with $ITEM_COUNT items."
  fi
fi

# 2. Update Backend Dependencies
echo "⚙️ Setting up backend environment..."
cd server
npm install --omit=dev
cd ..

# 3. Run database migrations (safe: only adds new columns/tables, never wipes data)
echo "🗄️ Running migrations..."
node migrate.js

# 4. Setup Python AI Service Virtual Environment
echo "🐍 Setting up Python AI service..."
cd ai-service
if [ ! -d "venv" ]; then
  python3 -m venv venv || virtualenv venv
fi
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 5. Update Frontend Dependencies and Build Assets
echo "💻 Setting up frontend environment..."
cd client
npm install
npm run build
cd ..

# 6. Restart the Backend Application and AI Service via PM2
echo "🔄 Reloading application server process..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo "🎉 Deployment completed successfully!"
