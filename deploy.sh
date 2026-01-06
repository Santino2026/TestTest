#!/bin/bash
# Deploy Sports League Office to production
# Usage: ./deploy.sh

set -e

SERVER="root@178.156.146.91"
SSH_KEY="~/.ssh/jmodernize"
REMOTE_DIR="/opt/sportsleagueoffice"

echo "🏀 Deploying Sports League Office..."

ssh -i $SSH_KEY $SERVER << 'REMOTE'
set -e
cd /opt/sportsleagueoffice

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing server dependencies..."
cd server
npm install

echo "🔨 Building server..."
npm run build

echo "📦 Installing client dependencies..."
cd ../client
npm install

echo "🔨 Building client..."
npm run build

echo "🔄 Restarting API..."
pm2 restart slo-api

echo ""
pm2 status slo-api
REMOTE

echo ""
echo "✅ Deployment complete!"
echo "🌐 Live at: https://sportsleagueoffice.com"
