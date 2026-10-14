Flip Count — это веб-сервис для расчёта прибыли от перепродаж.

Он сохраняет данные по каждой сделке, строит наглядные графики и систематизирует всю информацию в удобные таблицы. 
Пользователь всегда видит, сколько заработал и на каких именно операциях. 
Система берёт на себя все расчёты, избавляя от ручных подсчётов.

Целевая аудитория и назначение

Инструмент нужен всем, кто регулярно покупает и перепродаёт товары — как в реальных сделках, так и в игровых аукционах. 
Он помогает быстро оценивать выгоду и не упускать финансовые показатели. 
Сервис подходит для людей любого возраста, так как интерфейс понятный и дружелюбный. 
Flip Count предоставляет полную картину доходов, на которую можно опираться при принятии решений.


# Запуск Flip Count через Docker

## Требования

- Docker Desktop
- Git

Java, Maven и PostgreSQL устанавливать не нужно — они внутри контейнеров.

## Структура
Flip-Count/
├── Backend/
│ ├── Dockerfile
│ ├── .dockerignore
│ ├── pom.xml
│ └── src/
└── Frontend/

## Запуск

1 Клонировать проект и перейти в Backend:

git clone https://github.com/andreyvilchinskiy/Flip-Count.git

cd Flip-Count/Backend

2 Собрать образ:

docker build -t flipcount-api:1.0 .

3 Создать сеть:

docker network create flipcount-net

4 Запустить базу данных:

docker run -d --name flipcount-db --network flipcount-net -e POSTGRES_DB=flipcount -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=2507 postgres:16-alpine

timeout /t 5

5 Запустить API:

docker run -d --name flipcount-api --network flipcount-net -p 8080:8080 -e SPRING_DATASOURCE_URL=jdbc:postgresql://flipcount-db:5432/flipcount -e SPRING_DATASOURCE_USERNAME=postgres -e SPRING_DATASOURCE_PASSWORD=2507 flipcount-api:1.0

timeout /t 10

6 Проверить контейнеры:

docker ps

Должны быть два контейнера в статусе Up.

7 Проверить API:

curl http://localhost:8080/api/health

Ответ:
{"status":"OK","service":"Flip Count API","version":"1.0.0"}

## Запуск через Compose

Проверьте, что Compose v2 доступен:

docker compose version

Docker Compose version v2.27.0

Если команда не найдена — обновите Docker Desktop.

1. Клонировать проект

git clone https://github.com/andreyvilchinskiy/Flip-Count.git

cd Flip-Count

2. Собрать и запустить всё одной командой

docker compose up -d --build

3. Проверить контейнеры

docker compose ps

Должно быть три контейнера в статусе Up:

NAME                   STATUS
flipcount-db           Up (healthy)
flipcount-api          Up
flipcount-frontend     Up

4. Проверить API

curl http://localhost:8080/api/health

Ответ:
{"status":"OK","service":"Flip Count API","version":"1.0.0"}

5. Открыть фронтенд

В браузере:

http://localhost:8082