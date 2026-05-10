# 🚀 Cafe Fillo: AWS EC2 Deployment Guide

This guide will walk you through deploying your Restaurant Management System to a **Basic Free Tier AWS EC2 Instance** (Ubuntu).

The codebase has already been updated to use environment variables (`VITE_API_URL`) instead of hardcoded `localhost` URLs, making it ready for production.

---

## Step 1: Set up AWS EC2
1. Log into your AWS Console and go to **EC2**.
2. Click **Launch Instance**.
3. **Name:** `Restro-App`
4. **AMI:** Choose **Ubuntu Server 24.04 LTS** (Free tier eligible).
5. **Instance Type:** `t2.micro` (Free tier eligible).
6. **Key Pair:** Create a new key pair (e.g., `restro-key.pem`), download it, and keep it safe.
7. **Network Settings (Security Group):**
   - Check **Allow SSH traffic** (Port 22)
   - Check **Allow HTTP traffic** (Port 80)
   - Check **Allow HTTPS traffic** (Port 443)
8. Click **Launch Instance**.

---

## Step 2: Connect to your Instance
Open your terminal (or PowerShell) where your `.pem` file is downloaded:

```bash
# Set permissions for the key (Mac/Linux only, skip on Windows)
chmod 400 restro-key.pem

# Connect using SSH (Replace the IP with your instance's Public IPv4 address)
ssh -i "restro-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

## Step 3: Install Required Software (Node.js, Nginx, PM2)
Run these commands in your EC2 terminal:

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2 (Process Manager for Node.js) globally
sudo npm install -g pm2
```

---

## Step 4: Transfer Your Code to EC2
You can use `git` to clone your repository, or use `scp` to copy files directly. 

**Option A: Using Git (Recommended)**
```bash
# On your EC2 instance:
git clone https://github.com/VIDITshah123/restro.git restro
cd restro
```



---

## Step 5: Build and Start the Backend
```bash
# Go to the server directory
cd /home/ubuntu/restro/server

# Install dependencies
npm install

# Start the server using PM2 (I created an ecosystem.config.js for you)
cd /home/ubuntu/restro
pm2 start ecosystem.config.js

# Make PM2 restart automatically if the server reboots
pm2 startup
# (Run the command PM2 outputs, then run:)
pm2 save
```

---

## Step 6: Build the Frontend (React)
```bash
# Go to the frontend directory
cd /home/ubuntu/restro/client

# Install dependencies
npm install

# Create a .env file for production
echo "VITE_API_URL=http://<YOUR_EC2_PUBLIC_IP>" > .env

# Build the React app
npm run build
```

---

## Step 7: Configure Nginx to Serve the App
We need to tell Nginx to serve your built React files and forward `/api` requests to your Node backend.

```bash
# Create the Nginx config
sudo nano /etc/nginx/sites-available/restro
```

Paste the following configuration (replace `<YOUR_EC2_PUBLIC_IP>`):
```nginx
server {
    listen 80;
    server_name <YOUR_EC2_PUBLIC_IP>; # e.g., 54.123.45.67

    # Serve the React frontend
    location / {
        root /home/ubuntu/restro/client/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node backend
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy Socket.IO connections
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```
Save (`Ctrl+O`, `Enter`) and Exit (`Ctrl+X`).

**Enable the config and give Nginx permissions:**
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/restro /etc/nginx/sites-enabled/

# Remove the default Nginx config
sudo rm /etc/nginx/sites-enabled/default

# Give Nginx permission to read the files in the ubuntu home directory
sudo usermod -a -G ubuntu www-data
sudo chmod 711 /home/ubuntu

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🎉 Step 8: You're Live!
Open your browser and navigate to `http://<YOUR_EC2_PUBLIC_IP>`. 
Your restaurant management system is now running on AWS!
