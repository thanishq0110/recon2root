#!/bin/bash
# ============================================================
# Recon2Root — Fresh Ubuntu 24 VPS Setup Script
# Run as root: bash deploy.sh
# ============================================================
set -e

APP_DIR="/var/www/recon2root"
LOG_DIR="/var/log/recon2root"
DOMAIN="recon2root.online"

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

# ── Clone from GitHub ─────────────────────────────────────────
echo ""
read -p "Enter your GitHub repo URL (e.g. https://github.com/thanishq/recon2root): " REPO_URL

if [ -d "$APP_DIR/.git" ]; then
  echo "📂 Repo already exists, pulling latest..."
  cd "$APP_DIR" && git pull origin main
else
  echo "📂 Cloning repo..."
  git clone "$REPO_URL" "$APP_DIR"
fi

# ── Create directories ────────────────────────────────────────
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR/uploads/photos"
mkdir -p "$APP_DIR/uploads/videos"
mkdir -p "$APP_DIR/uploads/certificates"
mkdir -p "$APP_DIR/data"

# ── Install dependencies ──────────────────────────────────────
cd "$APP_DIR"
echo "📦 Installing npm dependencies..."
npm install --omit=dev

# ── Setup .env ────────────────────────────────────────────────
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
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN --redirect || \
  echo "⚠️  SSL setup failed — run certbot manually after DNS is ready"

# ── Setup SSH key for GitHub Actions ──────────────────────────
echo ""
echo "============================================"
echo "  🔑 Setting up GitHub Actions deploy key"
echo "============================================"
if [ ! -f /root/.ssh/github_actions ]; then
  ssh-keygen -t ed25519 -C "github-actions-deploy" -f /root/.ssh/github_actions -N ""
  # Allow this key to log in as root
  cat /root/.ssh/github_actions.pub >> /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
  echo ""
  echo "📋 Copy this PRIVATE key → add to GitHub as secret VPS_SSH_KEY:"
  echo "   GitHub repo → Settings → Secrets and variables → Actions → New secret"
  echo "   Name: VPS_SSH_KEY"
  echo ""
  cat /root/.ssh/github_actions
  echo ""
  read -p "Press Enter after you've saved the secret in GitHub..."
fi

# ── Start app with PM2 ────────────────────────────────────────
echo "▶️  Starting app with PM2..."
cd "$APP_DIR"
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
echo "  🌐 Site: https://$DOMAIN"
echo "  🔑 Admin: https://$DOMAIN/admin/login.html"
echo "  📊 PM2 status: pm2 status"
echo "  📋 Logs: pm2 logs recon2root"
echo "  🔄 Auto-deploy: push to GitHub main branch"
echo "============================================"
