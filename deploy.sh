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

# 1. Restore the live database from backup
DB_LIVE="server/data/restaurant.db"
DB_BACKUP="/home/ubuntu/db_backup/restaurant.db"

mkdir -p server/data
if [ -f "$DB_BACKUP" ]; then
  echo "✅ Restoring live database from backup ($DB_BACKUP)..."
  cp "$DB_BACKUP" "$DB_LIVE"
  echo "   Database restored."
else
  echo "⚠️  No backup found at $DB_BACKUP — starting with a fresh database."
fi

# 2. Update Backend Dependencies and Database Schema
echo "⚙️ Setting up backend environment..."
cd server
npm install --omit=dev

echo "🗄️ Running migrations..."
cd ..
node migrate.js
node server/db/seed.js

# 2. Setup Python AI Service Virtual Environment
echo "🐍 Setting up Python AI service..."
cd ai-service
if [ ! -d "venv" ]; then
  python3 -m venv venv || virtualenv venv
fi
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 3. Update Frontend Dependencies and Build Assets
echo "💻 Setting up frontend environment..."
cd client
npm install
npm run build
cd ..

# 4. Restart the Backend Application and AI Service via PM2
echo "🔄 Reloading application server process..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo "🎉 Deployment completed successfully!"
