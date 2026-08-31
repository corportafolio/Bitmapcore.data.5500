#!/bin/bash
# BitmapCore Analytics - Setup Script
# Ejecutar en VPS como root: bash setup_analytics.sh

set -e

WEB_DIR="/root/bitmapcore-web"
DATA_DIR="$WEB_DIR/data"
ANALYTICS_DB="$DATA_DIR/analytics.db"

echo "=== BitmapCore Analytics Setup ==="

# 1. Verificar que better-sqlite3 esta instalado
echo "Verificando dependencias..."
cd "$WEB_DIR"
if ! node -e "require('better-sqlite3')" 2>/dev/null; then
    echo "Instalando better-sqlite3..."
    npm install better-sqlite3
fi

# 2. Crear directorio data si no existe
mkdir -p "$DATA_DIR"

# 3. Copiar archivos de analytics
echo "Copiando archivos..."
cp analytics_collector.js "$WEB_DIR/"
cp daily_report.py "$WEB_DIR/"
cp Public/analytics.js "$WEB_DIR/Public/"

# 4. Crear .env si no existe
if [ ! -f "$WEB_DIR/.env" ]; then
    cp .env.analytics "$WEB_DIR/.env"
    echo "IMPORTANTE: Edita $WEB_DIR/.env con tus credenciales SMTP"
fi

# 5. Configurar pm2 para el collector
echo "Configurando pm2..."
pm2 delete analytics-collector 2>/dev/null || true
pm2 start analytics_collector.js --name analytics-collector --max-memory-restart 100M
pm2 save

# 6. Configurar crontab para reporte diario
echo "Configurando crontab..."
CRON_LINE="0 7 * * * cd $WEB_DIR && /usr/bin/python3 daily_report.py >> /var/log/analytics-report.log 2>&1"
(crontab -l 2>/dev/null | grep -v 'daily_report.py'; echo "$CRON_LINE") | crontab -

# 7. Configurar nginx (agregar location block)
echo ""
echo "=== Configuracion nginx ==="
echo "Agrega esto a tu config de nginx (en el server block de bitmapcore.net):"
echo ""
echo "    location /api/analytics/ {"
echo "        proxy_pass http://127.0.0.1:3001/;"
echo "        proxy_set_header Host \$host;"
echo "        proxy_set_header X-Real-IP \$remote_addr;"
echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
echo "    }"
echo ""
echo "Luego: nginx -t && systemctl reload nginx"

# 8. Verificar
echo ""
echo "=== Verificacion ==="
sleep 2
curl -s http://127.0.0.1:3001/health | python3 -m json.tool 2>/dev/null || echo "Collector no disponible aun (puede tardar unos segundos)"

echo ""
echo "=== Setup completado ==="
echo "Collector: pm2 status analytics-collector"
echo "Reporte: python3 $WEB_DIR/daily_report.py"
echo "Logs: pm2 logs analytics-collector"
