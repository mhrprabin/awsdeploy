# ── Stage 1: Build (PHP 8.3 + Composer + rdkafka) ────────────────────────────
FROM php:8.3-cli-alpine AS deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN apk add --no-cache git unzip librdkafka-dev $PHPIZE_DEPS && \
    pecl install rdkafka && \
    docker-php-ext-enable rdkafka && \
    apk del $PHPIZE_DEPS && \
    apk add --no-cache librdkafka

WORKDIR /app

COPY composer.json ./

RUN composer install --no-dev --optimize-autoloader --no-interaction --quiet

COPY artisan    artisan
COPY public/    public/
COPY bootstrap/ bootstrap/
COPY routes/    routes/
COPY app/       app/
COPY database/  database/

RUN composer dump-autoload --optimize

# ── Stage 2: Runtime (php-fpm + nginx + rdkafka) ─────────────────────────────
FROM php:8.3-fpm-alpine

RUN apk add --no-cache nginx librdkafka-dev $PHPIZE_DEPS && \
    pecl install rdkafka && \
    docker-php-ext-enable rdkafka && \
    apk del $PHPIZE_DEPS && \
    apk add --no-cache librdkafka && \
    docker-php-ext-install pdo pdo_mysql

WORKDIR /var/www/html

COPY --from=deps /app .

RUN mkdir -p storage/app/public storage/framework/cache/data \
             storage/framework/sessions storage/framework/testing \
             storage/framework/views storage/logs bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache && \
    chmod -R 775 storage bootstrap/cache

COPY nginx/default.conf   /etc/nginx/http.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
