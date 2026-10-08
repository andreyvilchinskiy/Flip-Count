# ============================================
# Фронтенд — раздача статики через nginx
# ============================================
FROM nginx:alpine

# Копируем все файлы фронтенда в nginx
COPY . /usr/share/nginx/html/

# Копируем конфиг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]