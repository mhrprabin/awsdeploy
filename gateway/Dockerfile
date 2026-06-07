FROM openresty/openresty:alpine-fat

RUN opm get SkyLothar/lua-resty-jwt

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY lua/                /usr/local/openresty/nginx/lua/

EXPOSE 80 443

# Substitute APP_HOST and DOMAIN at container start, then launch openresty
CMD ["/bin/sh", "-c", \
     "envsubst '${APP_HOST}${DOMAIN}' < /etc/nginx/nginx.conf.template > /usr/local/openresty/nginx/conf/nginx.conf && \
      /usr/local/openresty/bin/openresty -g 'daemon off;'"]
