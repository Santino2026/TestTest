# SSL/HTTPS Setup with Let's Encrypt

## Prerequisites
1. DNS A record pointing sportsleagueoffice.com → 178.156.146.91
2. SSH access to Hetzner server

## Setup Steps

### 1. Update DNS
Add these DNS records at your domain registrar:
```
Type  Host   Value
A     @      178.156.146.91
A     www    178.156.146.91
```

Wait for DNS propagation (can take up to 48 hours, usually 15-30 minutes).

### 2. Verify DNS
```bash
# Check if DNS is pointing correctly
dig sportsleagueoffice.com +short
# Should return: 178.156.146.91
```

### 3. SSH into Server
```bash
ssh -i ~/.ssh/jmodernize root@178.156.146.91
```

### 4. Install Certbot (if not installed)
```bash
apt update
apt install certbot python3-certbot-nginx -y
```

### 5. Obtain SSL Certificate
```bash
certbot --nginx -d sportsleagueoffice.com -d www.sportsleagueoffice.com
```

Follow the prompts:
- Enter email for renewal notices
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 6. Verify HTTPS
Visit https://sportsleagueoffice.com - should load with a valid certificate.

### 7. Update Environment Variables
```bash
nano /opt/sportsleagueoffice/server/.env
```

Update:
```
FRONTEND_URL=https://sportsleagueoffice.com
```

Restart the server:
```bash
pm2 restart slo-api
```

### 8. Test Auto-Renewal
```bash
certbot renew --dry-run
```

## Troubleshooting

### "Could not connect to sportsleagueoffice.com"
- DNS hasn't propagated yet. Wait and try again.
- Check firewall: `ufw status` (ports 80 and 443 must be open)

### "nginx: [error] invalid PID"
```bash
systemctl restart nginx
```

### Certificate Renewal
Let's Encrypt certificates expire every 90 days. Certbot sets up automatic renewal via cron/systemd. Verify:
```bash
systemctl status certbot.timer
```

## Current Nginx Config Location
`/etc/nginx/sites-available/sportsleagueoffice`

After SSL is configured, Certbot will modify this file to add HTTPS configuration.
