# ============================================
# ЭТАП 1: Сборка jar через Maven
# ============================================
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Сначала только pom.xml — кэшируем зависимости
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Потом исходники
COPY src ./src

# Сборка jar без тестов
RUN mvn clean package -DskipTests

# ============================================
# ЭТАП 2: Лёгкий образ только с JRE
# ============================================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Копируем готовый jar из первого этапа
COPY --from=builder /app/target/*.jar app.jar

# Документируем порт
EXPOSE 8080

# Команда запуска
ENTRYPOINT ["java", "-jar", "app.jar"]