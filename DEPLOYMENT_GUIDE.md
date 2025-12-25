# Deployment Guide - Fix SSH and File Transfer Issues

## Problem Analysis

You're encountering these issues because:
1. **Windows path on Linux**: You're on a Linux server trying to use Windows paths (`C:\Users\...`)
2. **Files on different machine**: Your project files are on your Windows PC, not on the server
3. **Missing build folder**: The `dist` folder doesn't exist because the project hasn't been built yet

## Solution Options

### Option 1: Deploy from Your Windows Machine (Recommended)

Since your project is on your Windows PC, you should upload files FROM your Windows machine TO the server.

#### Step 1: Build the Project on Windows

On your **Windows machine** (in PowerShell or Command Prompt):

```powershell
# Navigate to your project
cd C:\Users\DELL\Documents\ai-whale-trader-main

# Install dependencies (if not done)
npm install

# Build for production (creates dist folder)
npm run build
```

#### Step 2: Upload to Server from Windows

From your **Windows machine**, upload the built files:

```powershell
# Using SCP from Windows (if you have OpenSSH installed)
scp -r dist/* root@185.253.7.246:/var/www/html/

# OR if you prefer SFTP
sftp root@185.253.7.246
# Then in SFTP prompt:
cd /var/www/html
put -r dist/*
exit
```

**Alternative**: Use WinSCP (GUI tool) or FileZilla to drag-and-drop the `dist` folder contents.

---

### Option 2: Clone Repository on Server and Build There

If you have your code in a Git repository (GitHub, GitLab, etc.):

#### Step 1: On the Server, Clone Your Repository

```bash
# SSH into your server
ssh root@185.253.7.246

# Install Node.js if not installed
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Or use nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Clone your repository
cd /var/www
git clone <YOUR_GIT_REPO_URL> html
cd html
```

#### Step 2: Build on Server

```bash
# Install dependencies
npm install

# Create .env.production file with your environment variables
nano .env.production
# Add:
# VITE_SUPABASE_URL=your_url
# VITE_SUPABASE_PUBLISHABLE_KEY=your_key

# Build the project
npm run build
```

#### Step 3: Configure Web Server

```bash
# The dist folder should now exist
ls -la dist/

# If using Nginx (install if needed)
apt-get update
apt-get install -y nginx

# Configure Nginx
nano /etc/nginx/sites-available/default
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your IP address
    
    root /var/www/html/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Restart Nginx
nginx -t  # Test configuration
systemctl restart nginx
```

---

### Option 3: Use Git to Push from Windows, Pull on Server

#### Step 1: On Windows - Build and Push to Git

```powershell
cd C:\Users\DELL\Documents\ai-whale-trader-main

# Build locally
npm run build

# Commit and push (if using Git)
git add .
git commit -m "Build for production"
git push
```

#### Step 2: On Server - Pull and Deploy

```bash
ssh root@185.253.7.246
cd /var/www/html
git pull
# If dist is in .gitignore, build on server:
npm install
npm run build
```

---

## Setting Up SSH Key Authentication (Optional but Recommended)

To avoid entering password every time:

### On Your Windows Machine:

```powershell
# Generate SSH key (if you don't have one)
ssh-keygen -t rsa -b 4096

# Copy public key to server
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@185.253.7.246 "cat >> ~/.ssh/authorized_keys"
```

### On Server:

```bash
# Set correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Test connection (should work without password)
ssh root@185.253.7.246
```

---

## Quick Fix for Your Current Situation

Since you're already on the server, here's what to do RIGHT NOW:

### Option A: If you have Git repository

```bash
# On the server
cd /var/www
rm -rf html  # Remove if exists
git clone <YOUR_GIT_REPO_URL> html
cd html

# Install Node.js if needed
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install dependencies and build
npm install
npm run build  # This creates the dist folder

# Verify dist folder exists
ls -la dist/
```

### Option B: If you don't have Git, upload from Windows

**On your Windows machine** (PowerShell):

```powershell
cd C:\Users\DELL\Documents\ai-whale-trader-main
npm run build  # Build first

# Upload dist folder contents
scp -r dist/* root@185.253.7.246:/var/www/html/
```

---

## Important Notes

1. **Build first**: Always run `npm run build` before deployment - this creates the `dist` folder
2. **Environment variables**: Create `.env.production` file with your Supabase keys before building
3. **Web server**: You need Nginx or Apache to serve the static files
4. **Path differences**: Windows uses `C:\`, Linux uses `/` - paths are different

---

## Troubleshooting

### "Permission denied" Error
- Make sure SSH key is set up correctly
- Check file permissions: `chmod 600 ~/.ssh/authorized_keys`

### "No such file or directory"
- Check if you're in the right directory: `pwd`
- Make sure the `dist` folder exists: `ls -la dist/`
- Build the project first: `npm run build`

### Files not showing on website
- Check web server (Nginx/Apache) is running: `systemctl status nginx`
- Check web server is pointing to correct directory: `/var/www/html/dist`
- Check file permissions: `chmod -R 755 /var/www/html/dist`

