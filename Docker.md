D:\Проект\Flip-Count\Backend>docker build -t flipcount-api:test .
[+] Building 0.7s (15/15) FINISHED                                                                             docker:desktop-linux
 => [internal] load build definition from Dockerfile                                                                           0.0s
 => => transferring dockerfile: 964B                                                                                           0.0s
 => [internal] load metadata for docker.io/library/eclipse-temurin:17-jre-alpine                                               0.5s
 => [internal] load metadata for docker.io/library/maven:3.9-eclipse-temurin-17                                                0.5s
 => [internal] load .dockerignore                                                                                              0.0s
 => => transferring context: 97B                                                                                               0.0s
 => [builder 1/6] FROM docker.io/library/maven:3.9-eclipse-temurin-17@sha256:1a352420f7aba21f5ad08df31bab55f74c013fb491f1ae8a  0.0s
 => => resolve docker.io/library/maven:3.9-eclipse-temurin-17@sha256:1a352420f7aba21f5ad08df31bab55f74c013fb491f1ae8ab1dd7ff9  0.0s
 => [internal] load build context                                                                                              0.0s
 => => transferring context: 4.19kB                                                                                            0.0s
 => [stage-1 1/3] FROM docker.io/library/eclipse-temurin:17-jre-alpine@sha256:3c472129dc75a8d1d7a3f2df5b2093a8077e4493deff046  0.0s
 => => resolve docker.io/library/eclipse-temurin:17-jre-alpine@sha256:3c472129dc75a8d1d7a3f2df5b2093a8077e4493deff046754d4764  0.0s
 => CACHED [stage-1 2/3] WORKDIR /app                                                                                          0.0s
 => CACHED [builder 2/6] WORKDIR /app                                                                                          0.0s
 => CACHED [builder 3/6] COPY pom.xml .                                                                                        0.0s
 => CACHED [builder 4/6] RUN mvn dependency:go-offline -B                                                                      0.0s
 => CACHED [builder 5/6] COPY src ./src                                                                                        0.0s
 => CACHED [builder 6/6] RUN mvn clean package -DskipTests                                                                     0.0s
 => CACHED [stage-1 3/3] COPY --from=builder /app/target/*.jar app.jar                                                         0.0s
 => exporting to image                                                                                                         0.1s
 => => exporting layers                                                                                                        0.0s
 => => exporting manifest sha256:eab71c4c99b187b874c1cda1be509ca1f5ec93756728f251d4a83c0165d6734f                              0.0s
 => => exporting config sha256:f2d7c05fa7bead6127dd8eaa7257d3b3e2df7ad686ce357d5dafadfecc5624e6                                0.0s
 => => exporting attestation manifest sha256:b6219cdb70997fb38ea528db0d659f3feaa0f550fed40efed3facf073c3a0db3                  0.0s
 => => exporting manifest list sha256:addba1936c956c8af8d87aa1bdfb71a2226c53f768abc267bab4e4f165380d49                         0.0s
 => => naming to docker.io/library/flipcount-api:test                                                                          0.0s
 => => unpacking to docker.io/library/flipcount-api:test                                                                       0.0s

D:\Проект\Flip-Count\Backend>docker run -d --name flipcount-api --network flipcount-net -p 8080:8080 -e SPRING_DATASOURCE_URL=jdbc:postgresql://flipcount-db:5432/flipcount -e SPRING_DATASOURCE_USERNAME=postgres -e SPRING_DATASOURCE_PASSWORD=2507 flipcount-api:test
a0afa77d15343e63ca90349eb4a43f5bbc62823ac8c5b706657c93c034f4d41c

D:\Проект\Flip-Count\Backend>timeout /t 10

Время ожидания  0 сек., нажмите любую клавишу для продолжения ...

D:\Проект\Flip-Count\Backend>docker ps
CONTAINER ID   IMAGE                COMMAND                  CREATED          STATUS          PORTS                                         NAMES
a0afa77d1534   flipcount-api:test   "java -jar app.jar"      33 seconds ago   Up 32 seconds   0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp   flipcount-api
d4f1bc430356   postgres:16-alpine   "docker-entrypoint.s…"   33 minutes ago   Up 33 minutes   5432/tcp                                      flipcount-db

D:\Проект\Flip-Count\Backend>curl http://localhost:8080/api/health
{"status":"OK","service":"Flip Count API","version":"1.0.0"}
