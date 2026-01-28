#!/bin/bash

set -e

echo "Deploying to production..."

ssh root@178.156.146.91 << 'EOF'
  set -e
  cd /opt/sportsleagueoffice

  echo "Pulling latest code..."
  git pull origin main

  echo "Installing server dependencies..."
  cd server && npm install

  echo "Building server..."
  npm run build

  echo "Installing client dependencies..."
  cd ../client && npm install

  echo "Building client..."
  npm run build

  echo "Restarting PM2..."
  pm2 restart slo-api

  echo "Done!"
EOF

echo "Deployment complete!"
