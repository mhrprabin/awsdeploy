FROM openresty/openresty:alpine-fat

RUN opm get SkyLothar/lua-resty-jwt

COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY lua/       /usr/local/openresty/nginx/lua/

EXPOSE 80
