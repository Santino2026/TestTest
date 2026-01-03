#!/bin/bash
# Deploy script for Sports League Office
# Usage: ./deploy.sh

set -e

SERVER="root@178.156.146.91"
SSH_KEY="~/.ssh/jmodernize"
REMOTE_DIR="/opt/sportsleagueoffice"

echo "🏀 Deploying Sports League Office..."

# Build client
echo "📦 Building client..."
cd client
npm run build
cd ..

# Build server
echo "📦 Building server..."
cd server
npm run build
cd ..

# Upload server
echo "🚀 Uploading server..."
rsync -avz --delete -e "ssh -i $SSH_KEY" \
  server/dist/ $SERVER:$REMOTE_DIR/server/dist/
rsync -avz -e "ssh -i $SSH_KEY" \
  server/package.json server/package-lock.json $SERVER:$REMOTE_DIR/server/

# Upload client
echo "🚀 Uploading client..."
rsync -avz --delete -e "ssh -i $SSH_KEY" \
  client/dist/ $SERVER:$REMOTE_DIR/client/dist/

# Install deps and restart on server
echo "🔄 Installing dependencies and restarting..."
ssh -i $SSH_KEY $SERVER << 'REMOTE'
cd /opt/sportsleagueoffice/server
npm install --production

# Start or restart PM2 process
pm2 describe slo-api > /dev/null 2>&1 && pm2 restart slo-api || pm2 start dist/index.js --name slo-api

# Reload nginx
nginx -s reload

echo "✅ Deploy complete!"
pm2 status
REMOTE

echo "🎉 Deployment finished!"
echo "   Visit: http://sportsleagueoffice.com"
