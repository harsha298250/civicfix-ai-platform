# ==============================================================================
# CivicFix AI Platform — Backend Multi-Stage Dockerfile
# Stage 1: Build & package Spring Boot application with Maven and Eclipse Temurin JDK 21
# Stage 2: Minimal, hardened JRE 21 production runtime with non-root user
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Maven Build Stage
# ------------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build

# Copy dependency descriptor first to maximize Docker layer cache reuse
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy application source code and compile production JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime Stage
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Install curl for Actuator health monitoring and clean package manager cache
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system group and user
RUN groupadd -r -g 1001 civicfix \
    && useradd -r -u 1001 -g civicfix -s /bin/false -c "CivicFix Application Service User" civicfix

# Prepare uploads directory and ensure non-root ownership
RUN mkdir -p /app/uploads/evidence \
    && chown -R civicfix:civicfix /app

# Copy compiled executable JAR from builder stage
COPY --from=build --chown=civicfix:civicfix /build/target/civicfix-backend-*.jar /app/app.jar

# Switch to unprivileged non-root user
USER civicfix:civicfix

# Expose backend HTTP service port
EXPOSE 8080

# Spring Boot Actuator health probe for container orchestrator readiness
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Launch application with container-aware JVM settings
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]

