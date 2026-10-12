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

Клонировать проект и перейти в Backend:

git clone https://github.com/andreyvilchinskiy/Flip-Count.git

cd Flip-Count/Backend

Собрать образ:

docker build -t flipcount-api:1.0 .

Создать сеть:

docker network create flipcount-net

Запустить базу данных:

docker run -d --name flipcount-db --network flipcount-net -e POSTGRES_DB=flipcount -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=2507 postgres:16-alpine
timeout /t 5

Запустить API:

docker run -d --name flipcount-api --network flipcount-net -p 8080:8080 -e SPRING_DATASOURCE_URL=jdbc:postgresql://flipcount-db:5432/flipcount -e SPRING_DATASOURCE_USERNAME=postgres -e SPRING_DATASOURCE_PASSWORD=2507 flipcount-api:1.0

timeout /t 10


Проверить контейнеры:

docker ps

Должны быть два контейнера в статусе Up.

Проверить API:

curl http://localhost:8080/api/health

Ответ:
{"status":"OK","service":"Flip Count API","version":"1.0.0"}





