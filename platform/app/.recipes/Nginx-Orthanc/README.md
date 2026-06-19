# Docker compose files

# Build

Using docker compose you can build the image with the following command:

```bash
docker-compose build
```

# Run

To run the container use the following command:

```bash
docker-compose up
```

# Routes

http://localhost/ -> OHIF
localhost/pacs -> Orthanc

---

# Complete Guide: Migrating OHIF + Orthanc from HTTP to HTTPS

This guide walks you through migrating your OHIF viewer and Orthanc PACS server from HTTP to HTTPS with Let's Encrypt certificates.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Overview](#overview)
3. [Step 1: Prepare Directory Structure](#step-1-prepare-directory-structure)
4. [Step 2: Update docker-compose.yml](#step-2-update-docker-composeyml)
5. [Step 3: Configure Nginx for HTTPS](#step-3-configure-nginx-for-https)
6. [Step 4: Generate SSL Certificates](#step-4-generate-ssl-certificates)
7. [Step 5: Fix Certificate Permissions](#step-5-fix-certificate-permissions)
8. [Step 6: Configure Orthanc for HTTPS Webhooks](#step-6-configure-orthanc-for-https-webhooks)
9. [Step 7: Restart Services](#step-7-restart-services)
10. [Step 8: Verify HTTPS](#step-8-verify-https)
11. [Troubleshooting](#troubleshooting)
12. [Certificate Renewal](#certificate-renewal)

---

## Prerequisites

- Docker and Docker Compose installed
- Domain name pointing to your server (e.g., `uatcaseviewer.biedx.com`)
- Port 80 and 443 open in firewall
- Access to the server as a user with sudo privileges
- OHIF and Orthanc already running on HTTP

---

## Overview

**What we're doing:**
1. Generate Let's Encrypt SSL certificates for your domain
2. Configure Nginx to serve HTTPS and redirect HTTP to HTTPS
3. Configure Orthanc to verify SSL certificates for outbound HTTPS requests
4. Mount certificates and CA bundles in Docker containers

**Files we'll modify:**
- `docker-compose.yml` - Add certificate volume mounts
- `config/nginx.conf` - Add HTTPS server block
- `config/orthanc.json` - Configure CA certificates for SSL verification

---

## Step 1: Prepare Directory Structure

Create directories for certificates (separate from database volumes):

```bash
cd ~/OHIF/platform/app/.recipes/Nginx-Orthanc

# Create certificate directories
mkdir -p certificates/letsencrypt certificates/letsencrypt-challenges

# Verify directories created
ls -la certificates/
```

**Why:** We keep certificates separate from `volumes/` (which contains database files) for better organization.

---

## Step 2: Update docker-compose.yml

Add certificate volume mounts to both services.

### 2.1 Update `ohif_orthanc` service

Add these volumes to the `ohif_orthanc` service:

```yaml
volumes:
  # ... existing volumes ...
  # TLS certificates and ACME HTTP challenge files
  - ./certificates/letsencrypt:/etc/letsencrypt:ro
  - ./certificates/letsencrypt-challenges:/var/www/letsencrypt
```

**Complete `ohif_orthanc` section should look like:**

```yaml
ohif_orthanc:
  build:
    context: ./../../../../
    dockerfile: ./platform/app/.recipes/Nginx-Orthanc/dockerfile
  image: webapp:latest
  container_name: ohif_orthanc
  volumes:
    # Nginx config
    - ./config/nginx.conf:/etc/nginx/nginx.conf
    # Logs
    - ./logs/nginx:/var/logs/nginx
    # TLS certificates and ACME HTTP challenge files
    - ./certificates/letsencrypt:/etc/letsencrypt:ro
    - ./certificates/letsencrypt-challenges:/var/www/letsencrypt
  ports:
    - '443:443' # SSL
    - '80:80' # Web
  depends_on:
    - orthanc
  restart: on-failure
```

### 2.2 Update `orthanc` service

Add CA certificates volume mount to the `orthanc` service:

```yaml
volumes:
  # ... existing volumes ...
  # CA certificates for HTTPS verification (Let's Encrypt, etc.)
  - /etc/ssl/certs:/etc/ssl/certs:ro
```

**Complete `orthanc` section should look like:**

```yaml
orthanc:
  image: orthancteam/orthanc:latest-full
  hostname: orthanc
  container_name: orthancPACS
  environment:
    ORTHANC__REGISTERED_USERS: '{"${ORTHANC_ADMIN_USERNAME:-admin}":"${ORTHANC_ADMIN_PASSWORD:?set ORTHANC_ADMIN_PASSWORD in .env}"}'
    ORTHANC__AZURE_BLOB_STORAGE__CONNECTION_STRING: ${ORTHANC_AZURE_CONNECTION_STRING:?set ORTHANC_AZURE_CONNECTION_STRING in .env}
    ORTHANC__AZURE_BLOB_STORAGE__CONTAINER_NAME: ${ORTHANC_AZURE_CONTAINER_NAME:?set ORTHANC_AZURE_CONTAINER_NAME in .env}
  volumes:
    # Config
    - ./config/orthanc.json:/etc/orthanc/orthanc.json:ro
    # Persist data
    - ./volumes/orthanc-db/:/var/lib/orthanc/db/
    - ./config/notify-study.lua:/etc/orthanc/notify-study.lua:ro
    # CA certificates for HTTPS verification (Let's Encrypt, etc.)
    - /etc/ssl/certs:/etc/ssl/certs:ro
  restart: unless-stopped
  ports:
    - '4242:4242' # Orthanc REST API
    - '8042:8042' # Orthanc HTTP
```

**What this does:**
- Mounts Let's Encrypt certificates into Nginx container (read-only)
- Mounts system CA certificates into Orthanc container for SSL verification

---

## Step 3: Configure Nginx for HTTPS

Update `config/nginx.conf` to add HTTPS server block.

### 3.1 Current HTTP Block

Keep your existing HTTP block but add redirect to HTTPS:

```nginx
# HTTP listener: redirect all traffic to HTTPS.
server {
  listen [::]:80;
  listen 80;
  server_name uatcaseviewer.biedx.com;

  # Redirect all HTTP traffic to HTTPS
  location / {
    return 301 https://$server_name$request_uri;
  }
}
```

### 3.2 Add HTTPS Server Block

Add this HTTPS server block after the HTTP block:

```nginx
# HTTPS listener
server {
  listen [::]:443 ssl;
  listen 443 ssl;
  server_name uatcaseviewer.biedx.com;

  # SSL Certificate paths (mounted from certificates/letsencrypt)
  ssl_certificate /etc/letsencrypt/live/uatcaseviewer.biedx.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/uatcaseviewer.biedx.com/privkey.pem;

  # SSL Configuration
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:10m;
  ssl_session_tickets off;

  # Compression
  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;
  gzip_comp_level 9;
  etag on;

  # Reverse Proxy for Orthanc APIs (including DICOMWeb)
  location /pacs/ {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    expires 0;
    add_header Cache-Control private;
    add_header 'Access-Control-Allow-Origin' '*' always;
    proxy_pass http://orthanc:8042/;
    proxy_read_timeout 600s;
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    send_timeout 600s;
    keepalive_timeout 600s;
    client_max_body_size 2G;
  }

  # Service Worker
  location /sw.js {
    add_header Cache-Control "no-cache";
    proxy_cache_bypass $http_pragma;
    proxy_cache_revalidate on;
    expires off;
    access_log off;
  }

  # Single Page App (OHIF Viewer)
  location / {
    root /var/www/html;
    index index.html;
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-store, no-cache, must-revalidate";
  }
}
```

**Important:** Replace `uatcaseviewer.biedx.com` with your actual domain name.

---

## Step 4: Generate SSL Certificates

We'll use **standalone mode** which temporarily stops Nginx to get certificates.

### 4.1 Stop Nginx Container

```bash
cd ~/OHIF/platform/app/.recipes/Nginx-Orthanc

# Stop Nginx (standalone mode needs port 80)
docker compose stop ohif_orthanc

#or Use yarn orthanc:down

# Verify it's stopped
docker compose ps ohif_orthanc
```

### 4.2 Run Certbot

```bash
# Make sure you're in the correct directory
cd ~/OHIF/platform/app/.recipes/Nginx-Orthanc

# Run certbot in standalone mode
docker run --rm \
  -p 80:80 \
  -v $(pwd)/certificates/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly \
  --standalone \
  -d uatcaseviewer.biedx.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

**Replace:**
- `uatcaseviewer.biedx.com` with your domain
- `your-email@example.com` with your email address

**Expected output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/uatcaseviewer.biedx.com/fullchain.pem
```

### 4.3 Verify Certificates Created

```bash
# Check certificates on host
ls -la certificates/letsencrypt/live/uatcaseviewer.biedx.com/

# You should see:
# - fullchain.pem (symlink)
# - privkey.pem (symlink)
# - cert.pem
# - chain.pem
```

---

## Step 5: Fix Certificate Permissions

Certbot creates certificates as root. We need to fix permissions so the Nginx container can read them.

### 5.1 Fix Ownership

```bash
cd ~/OHIF/platform/app/.recipes/Nginx-Orthanc

# Change ownership to your user
sudo chown -R $USER:$USER certificates/letsencrypt/

# Verify ownership changed
ls -la certificates/letsencrypt/live/uatcaseviewer.biedx.com/
```

### 5.2 Fix Permissions

```bash
# Set readable permissions
chmod -R 755 certificates/letsencrypt/

# Verify permissions
ls -la certificates/letsencrypt/live/uatcaseviewer.biedx.com/
# Should show: -rw-r--r-- or -rwxr-xr-x
```

**Why:** Docker containers run as non-root users and need read access to certificate files.

---

## Step 6: Configure Orthanc for HTTPS Webhooks

If your Orthanc webhooks call HTTPS endpoints (like `https://uatapi.biedx.com`), Orthanc needs CA certificates to verify SSL.

### 6.1 Find CA Certificates Path on Host

```bash
# Check if standard CA bundle exists
ls -la /etc/ssl/certs/ca-certificates.crt

# If not found, try alternatives:
ls -la /etc/pki/tls/certs/ca-bundle.crt  # CentOS/RHEL

# Or find it:
find /etc -name "*ca-certificates*" -o -name "*ca-bundle*" 2>/dev/null
```

**Common paths:**
- Ubuntu/Debian: `/etc/ssl/certs/ca-certificates.crt`
- CentOS/RHEL: `/etc/pki/tls/certs/ca-bundle.crt`

### 6.2 Update orthanc.json

Edit `config/orthanc.json` and update these settings:

```json
{
  "HttpsVerifyPeers": true,
  "HttpsCACertificates": "/etc/ssl/certs/ca-certificates.crt"
}
```

**What this does:**
- `HttpsVerifyPeers: true` - Enables SSL certificate verification
- `HttpsCACertificates` - Points to CA bundle for verifying Let's Encrypt certificates

**Note:** The path `/etc/ssl/certs/ca-certificates.crt` is inside the container (mounted from host's `/etc/ssl/certs`).

### 6.3 Verify CA Certificates Mount

The `docker-compose.yml` should already have this mount (from Step 2.2):

```yaml
volumes:
  - /etc/ssl/certs:/etc/ssl/certs:ro
```

This mounts the host's CA certificates into the container at `/etc/ssl/certs`.

---

## Step 7: Restart Services

### 7.1 Start Nginx Container

```bash
cd ~/OHIF/platform/app/.recipes/Nginx-Orthanc

# Start Nginx
docker compose start ohif_orthanc

# Or if starting fresh:
docker compose up -d ohif_orthanc

#Or use
yarn orthanc:up
```

### 7.2 Verify Nginx Config

```bash
# Test Nginx configuration
docker compose exec ohif_orthanc nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 7.3 Restart Orthanc (if config changed)

```bash
# Restart Orthanc to apply CA certificate changes
docker compose restart orthancPACS

# Check logs
docker compose logs orthancPACS --tail 20
```

---

## Step 8: Verify HTTPS

### 8.1 Test HTTP Redirect

```bash
# Should redirect to HTTPS
curl -I http://uatcaseviewer.biedx.com

# Expected: HTTP/1.1 301 Moved Permanently
#           Location: https://uatcaseviewer.biedx.com/...
```

### 8.2 Test HTTPS

```bash
# Should return 200 OK with SSL
curl -I https://uatcaseviewer.biedx.com

# Expected: HTTP/2 200
```

### 8.3 Test in Browser

1. Open `https://uatcaseviewer.biedx.com` in your browser
2. Check for padlock icon (🔒) in address bar
3. Verify no SSL warnings

### 8.4 Test Orthanc Webhook

Upload a DICOM study and check logs:

```bash
# Watch Orthanc logs for webhook success
docker compose logs -f orthancPACS | grep -i webhook

# Should see:
# INFO Webhook sent successfully for study: ...
```

If you see SSL errors, check Step 6 again.

---

## Troubleshooting

### Issue: Nginx won't start - "cannot load certificate"

**Cause:** Certificates don't exist or have wrong permissions.

**Fix:**
```bash
# 1. Verify certificates exist
ls -la certificates/letsencrypt/live/uatcaseviewer.biedx.com/fullchain.pem

# 2. Fix permissions
sudo chown -R $USER:$USER certificates/letsencrypt/
chmod -R 755 certificates/letsencrypt/

# 3. Restart
docker compose restart ohif_orthanc
```

### Issue: "ERR_CONNECTION_REFUSED" in browser

**Cause:** Nginx container not running or ports not exposed.

**Fix:**
```bash
# Check container status
docker compose ps ohif_orthanc

# Check if ports are listening
sudo netstat -tlnp | grep -E ':(80|443)'

# Restart container
docker compose restart ohif_orthanc
```

### Issue: Orthanc webhook SSL verification fails

**Cause:** CA certificates not mounted or wrong path.

**Fix:**
```bash
# 1. Verify CA certificates exist on host
ls -la /etc/ssl/certs/ca-certificates.crt

# 2. Verify mount in docker-compose.yml
grep "ssl/certs" docker-compose.yml

# 3. Verify path in orthanc.json
grep "HttpsCACertificates" config/orthanc.json

# 4. Check inside container
docker compose exec orthancPACS ls -la /etc/ssl/certs/ca-certificates.crt

# 5. Restart Orthanc
docker compose restart orthancPACS
```

### Issue: Certbot fails - "Invalid response"

**Cause:** DNS not pointing to server or port 80 blocked.

**Fix:**
```bash
# 1. Verify DNS
dig uatcaseviewer.biedx.com
# Should show your server IP

# 2. Check firewall
sudo ufw status
# Port 80 and 443 should be open

# 3. Verify Nginx is stopped (for standalone mode)
docker compose ps ohif_orthanc
```

---

## Certificate Renewal

Let's Encrypt certificates expire after 90 days. Renew manually:

### Manual Renewal Process

```bash
cd ~/OHIF/platform/app/.recipes/Nginx-Orthanc

# 1. Stop Nginx
docker compose stop ohif_orthanc

#Or yarn orthanc:down

# 2. Renew certificates
docker run --rm \
  -p 80:80 \
  -v $(pwd)/certificates/letsencrypt:/etc/letsencrypt \
  certbot/certbot renew --standalone

# 3. Fix permissions (if needed)
sudo chown -R $USER:$USER certificates/letsencrypt/
chmod -R 755 certificates/letsencrypt/

# 4. Start Nginx
docker compose start ohif_orthanc

# 5. Reload Nginx to use new certificates
docker compose exec ohif_orthanc nginx -s reload
```

### Check Certificate Expiry

```bash
# Check when certificates expire
docker run --rm \
  -v $(pwd)/certificates/letsencrypt:/etc/letsencrypt \
  certbot/certbot certificates
```

**Tip:** Set a calendar reminder to renew 30 days before expiry.

---

## Summary of Changes

### Files Modified:

1. **docker-compose.yml**
   - Added certificate volume mounts to `ohif_orthanc`
   - Added CA certificates mount to `orthanc`

2. **config/nginx.conf**
   - Added HTTPS server block
   - Added HTTP to HTTPS redirect

3. **config/orthanc.json**
   - Set `HttpsVerifyPeers: true`
   - Set `HttpsCACertificates` path

### Directories Created:

- `certificates/letsencrypt/` - SSL certificates
- `certificates/letsencrypt-challenges/` - ACME challenge files (if using webroot mode)

### Permissions:

- Certificates: `755` (readable by containers)
- Ownership: Your user (not root)

---

## Quick Reference Commands

```bash
# Navigate to project
cd ~/OHIF/platform/app/.recipes/Nginx-Orthanc

# Generate certificates
docker compose stop ohif_orthanc
docker run --rm -p 80:80 -v $(pwd)/certificates/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --standalone -d your-domain.com \
  --email your-email@example.com --agree-tos --no-eff-email

# Fix permissions
sudo chown -R $USER:$USER certificates/letsencrypt/
chmod -R 755 certificates/letsencrypt/

# Restart services
docker compose restart ohif_orthanc orthancPACS

# Test HTTPS
curl -I https://your-domain.com

# Check logs
docker compose logs ohif_orthanc
docker compose logs orthancPACS
```

---

## Need Help?

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `docker compose logs`
3. Verify all file paths and permissions
4. Ensure DNS points to your server
5. Check firewall rules for ports 80 and 443

---

**Congratulations!** Your OHIF viewer and Orthanc are now running on HTTPS! 🔒

---

See [here](../../../docs/docs/deployment/nginx--image-archive.md) for more information about this recipe.
