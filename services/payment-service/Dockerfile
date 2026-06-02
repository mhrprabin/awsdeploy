# ── Stage 1: Build (PHP 8.3 + Composer + rdkafka) ────────────────────────────
FROM php:8.3-cli-alpine AS deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# $PHPIZE_DEPS = autoconf gcc make etc. needed to compile PHP extensions
RUN apk add --no-cache git unzip librdkafka-dev $PHPIZE_DEPS && \
    pecl install rdkafka && \
    docker-php-ext-enable rdkafka && \
    apk del $PHPIZE_DEPS

WORKDIR /app

RUN composer create-project laravel/laravel:^11.0 . \
      --prefer-dist --no-dev --quiet
# No extra Kafka package needed — we use the rdkafka extension directly

RUN rm -f database/migrations/*.php

COPY bootstrap/app.php      bootstrap/app.php
COPY routes/api.php         routes/api.php
COPY app/                   app/
COPY database/migrations/   database/migrations/

RUN composer dump-autoload --optimize

# ── Stage 2: Runtime (php-fpm + nginx + rdkafka) ─────────────────────────────
FROM php:8.3-fpm-alpine

# Install rdkafka in runtime too (keep librdkafka but drop build tools)
RUN apk add --no-cache nginx librdkafka-dev $PHPIZE_DEPS && \
    pecl install rdkafka && \
    docker-php-ext-enable rdkafka && \
    apk del $PHPIZE_DEPS && \
    apk add --no-cache librdkafka && \
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
