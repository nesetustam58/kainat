#!/bin/bash
set -e
# Kainat Kütüphanesi - Otomatik Yedekleme
# 3-çekmece sistemi + env + docs

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="kainat-web/backups"
mkdir -p "$BACKUP_DIR"

echo "📦 Kainat yedekleme başlıyor: $DATE"

# 1. Kod yedeği
tar -czf "$BACKUP_DIR/kainat-kod-$DATE.tar.gz" \
  --exclude="node_modules" \
  --exclude=".next" \
  --exclude="backups" \
  kainat-web/src \
  kainat-web/app \
  kainat-web/docs \
  kainat-web/public \
  kainat-web/.env.example \
  kainat-web/package.json \
  backup.sh 2>/dev/null || true

# 2. Supabase (opsiyonel - .env.local varsa)
if [ -f "kainat-web/.env.local" ]; then
  cp kainat-web/.env.local "$BACKUP_DIR/env-$DATE.bak"
  echo "🔑 .env.local yedeklendi"
fi

# 3. Boyut
SIZE=$(du -h "$BACKUP_DIR/kainat-kod-$DATE.tar.gz" | cut -f1)

echo "✅ Yedek tamam: $BACKUP_DIR/kainat-kod-$DATE.tar.gz ($SIZE)"
ls -lh "$BACKUP_DIR/" | tail -5