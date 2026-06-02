# ── Stage 1: Build (PHP 8.3 + Composer) ──────────────────────────────────────
FROM php:8.3-cli-alpine AS deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN apk add --no-cache git unzip

WORKDIR /app

RUN composer create-project laravel/laravel:^11.0 . \
      --prefer-dist --no-dev --quiet

RUN rm -f database/migrations/*.php

COPY bootstrap/app.php      bootstrap/app.php
COPY routes/api.php         routes/api.php
COPY app/                   app/
COPY database/migrations/   database/migrations/

RUN composer dump-autoload --optimize

# ── Stage 2: Runtime (php-fpm + nginx) ───────────────────────────────────────
FROM php:8.3-fpm-alpine

RUN apk add --no-cache nginx && \
    docker-php-ext-install pdo pdo_mysql

WORKDIR /var/www/html

COPY --from=deps /app .

RUN chown -R www-data:www-data storage bootstrap/cache && \
    chmod -R 775 storage bootstrap/cache

COPY nginx/default.conf   /etc/nginx/http.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
