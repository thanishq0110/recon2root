#!/bin/bash
# ============================================================
# Recon2Root — Fresh Ubuntu 24 VPS Setup Script
# Run as root: bash deploy.sh
# ============================================================
set -e

APP_DIR="/var/www/recon2root"
LOG_DIR="/var/log/recon2root"
DOMAIN="recon2root.online"
REPO_URL="https://github.com/thanishq0110/recon2root"

echo "🚀 Starting Recon2Root deployment..."

# ── System update ─────────────────────────────────────────────
apt-get update -y && apt-get upgrade -y

# ── Install Node.js 20 ────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "✅ Node.js $(node -v)"

# ── Install Nginx ─────────────────────────────────────────────
if ! command -v nginx &> /dev/null; then
  echo "📦 Installing Nginx..."
  apt-get install -y nginx
fi
systemctl enable nginx

# ── Install Certbot ───────────────────────────────────────────
if ! command -v certbot &> /dev/null; then
  echo "📦 Installing Certbot..."
  apt-get install -y certbot python3-certbot-nginx
fi

# ── Install PM2 ───────────────────────────────────────────────
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  npm install -g pm2
fi

# ── Install git ───────────────────────────────────────────────
apt-get install -y git

# ── Clone / pull from GitHub ──────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "📂 Repo already exists, pulling latest..."
  cd "$APP_DIR" && git pull origin main
else
  echo "📂 Cloning repo from $REPO_URL ..."
  git clone "$REPO_URL" "$APP_DIR"
fi

# ── Create upload/data directories (not tracked by git) ───────
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR/uploads/photos"
mkdir -p "$APP_DIR/uploads/videos"
mkdir -p "$APP_DIR/uploads/certificates"
mkdir -p "$APP_DIR/data"

# ── Install dependencies ──────────────────────────────────────
cd "$APP_DIR"
echo "📦 Installing npm dependencies..."
npm install --omit=dev

# ── Setup .env (only on first run) ────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo "⚙️  Creating .env file..."
  JWT_SECRET=$(openssl rand -hex 48)
  cat > "$APP_DIR/.env" << EOF
PORT=3000
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=8h
NODE_ENV=production
EOF
  echo "✅ .env created with random JWT secret"
fi

# ── Nginx config ──────────────────────────────────────────────
echo "⚙️  Configuring Nginx..."
cp "$APP_DIR/deploy/nginx.conf" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── SSL Certificate ───────────────────────────────────────────
echo "🔒 Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email thanishq0110@gmail.com --redirect || \
  echo "⚠️  SSL setup failed — run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"

# ── Setup SSH key for GitHub Actions (only on first run) ──────
echo ""
echo "============================================"
echo "  🔑 GitHub Actions Deploy Key Setup"
echo "============================================"
if [ ! -f /root/.ssh/github_actions ]; then
  ssh-keygen -t ed25519 -C "github-actions@recon2root" -f /root/.ssh/github_actions -N ""
  # Allow this key to SSH into the server
  cat /root/.ssh/github_actions.pub >> /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
fi

echo ""
echo "📋 ─────────────────────────────────────────────────────"
echo "   Copy the PRIVATE KEY below and add it to GitHub:"
echo "   → github.com/thanishq0110/recon2root"
echo "   → Settings → Secrets and variables → Actions"
echo "   → New repository secret"
echo "   → Name: VPS_SSH_KEY"
echo "   → Value: (paste everything below including the dashes)"
echo "─────────────────────────────────────────────────────────"
cat /root/.ssh/github_actions
echo "─────────────────────────────────────────────────────────"
echo ""

# ── Start app with PM2 ────────────────────────────────────────
echo "▶️  Starting app with PM2..."
cd "$APP_DIR"
pm2 delete recon2root 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# ── Create admin user ─────────────────────────────────────────
echo ""
echo "============================================"
echo "  🔐 Create your admin account"
echo "============================================"
npm run seed

echo ""
echo "============================================"
echo "  ✅ Deployment complete!"
echo "  🌐 Site:  https://$DOMAIN"
echo "  🔑 Admin: https://$DOMAIN/admin/login.html"
echo "  📊 PM2:   pm2 status"
echo "  📋 Logs:  pm2 logs recon2root"
echo "  🔄 Auto-deploy: push to GitHub main branch"
echo "============================================"
