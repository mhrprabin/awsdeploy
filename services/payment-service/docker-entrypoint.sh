#!/bin/sh
set -e

if [ -z "$APP_KEY" ]; then
    APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
fi

cat > /var/www/html/.env << EOF
APP_NAME=PaymentService
APP_ENV=production
APP_KEY=${APP_KEY}
APP_DEBUG=false
APP_URL=http://localhost

LOG_CHANNEL=stderr

DB_CONNECTION=mysql
DB_HOST=${DB_HOST:-mysql}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_NAME:-payments_db}
DB_USERNAME=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
EOF

cd /var/www/html

echo "Waiting for database ${DB_HOST:-mysql}:${DB_PORT:-3306}..."
until php -r "
  try {
    new PDO(
      'mysql:host=${DB_HOST:-mysql};port=${DB_PORT:-3306};dbname=${DB_NAME:-payments_db}',
      '${DB_USER:-root}',
      '${DB_PASSWORD:-}'
    );
    exit(0);
  } catch (Exception \$e) { exit(1); }
" 2>/dev/null; do
    echo "  DB not ready — retrying in 3s"
    sleep 3
done
echo "Database ready."

php artisan migrate --force

php artisan config:cache || echo "config:cache skipped"
php artisan route:cache  || echo "route:cache skipped"

php-fpm -D
exec nginx -g 'daemon off;'
