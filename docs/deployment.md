# Deployment Guide

## Overview

This guide covers deploying Rapid Force Cyber Fusion to production environments, including cloud platforms, container orchestration, and infrastructure setup.

## Deployment Options

1. **Docker Compose** - Simple deployment for small teams
2. **Kubernetes** - Scalable production deployment
3. **Cloud Platforms** - AWS, GCP, Azure managed services
4. **On-Premise** - Self-hosted deployment

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 4 cores
- **RAM**: 16 GB
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps

#### Recommended Requirements
- **CPU**: 8+ cores
- **RAM**: 32+ GB
- **Storage**: 500+ GB SSD
- **Network**: 10 Gbps

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Kubernetes 1.25+ (for K8s deployment)
- kubectl 1.25+ (for K8s deployment)
- Helm 3.0+ (for Helm deployment)
- PostgreSQL 15+ (if not using managed service)
- Redis 7+ (if not using managed service)

## Docker Compose Deployment

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/your-org/rapid-force-cyber-fusion.git
cd rapid-force-cyber-fusion
```

2. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with production values
```

3. **Build and start services**
```bash
docker-compose up -d
```

4. **Check service status**
```bash
docker-compose ps
```

5. **View logs**
```bash
docker-compose logs -f
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: rapid_force
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  api-server:
    build: ./artifacts/api-server
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/rapid_force
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  cyber-fusion:
    build: ./artifacts/cyber-fusion
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000/api
    depends_on:
      - api-server
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Production Considerations

- Use SSL/TLS certificates
- Configure proper backup strategy
- Set up monitoring and alerting
- Use environment-specific configurations
- Implement proper logging

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- Helm 3.0+ (optional)
- Ingress controller (NGINX, Traefik, etc.)
- Certificate manager (cert-manager)

### Deployment Steps

#### 1. Create Namespace

```bash
kubectl create namespace rapid-force
```

#### 2. Create Secrets

```bash
kubectl create secret generic rapid-force-secrets \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=db-password=your-db-password \
  --from-literal=api-key=your-api-key \
  -n rapid-force
```

#### 3. Deploy PostgreSQL

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: rapid-force
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: rapid_force
        - name: POSTGRES_USER
          value: rapid_force
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: rapid-force-secrets
              key: db-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: rapid-force
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: rapid-force
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

```bash
kubectl apply -f postgres-deployment.yaml
```

#### 4. Deploy Redis

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: rapid-force
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-storage
          mountPath: /data
      volumes:
      - name: redis-storage
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: rapid-force
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: rapid-force
spec:
  accessModes:
    - ReadWriteOnce
  resources:
      storage: 10Gi
```

```bash
kubectl apply -f redis-deployment.yaml
```

#### 5. Deploy API Server

```yaml
# api-server-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: rapid-force
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api-server
        image: your-registry/rapid-force-api-server:latest
        env:
        - name: DATABASE_URL
          value: postgresql://rapid_force:$(DB_PASSWORD)@postgres:5432/rapid_force
        - name: REDIS_URL
          value: redis://redis:6379
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: rapid-force-secrets
              key: jwt-secret
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-server
  namespace: rapid-force
spec:
  selector:
    app: api-server
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

```bash
kubectl apply -f api-server-deployment.yaml
```

#### 6. Deploy Frontend

```yaml
# cyber-fusion-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cyber-fusion
  namespace: rapid-force
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cyber-fusion
  template:
    metadata:
      labels:
        app: cyber-fusion
    spec:
      containers:
      - name: cyber-fusion
        image: your-registry/rapid-force-cyber-fusion:latest
        env:
        - name: VITE_API_URL
          value: https://api.rapidforce.ai/api
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: cyber-fusion
  namespace: rapid-force
spec:
  selector:
    app: cyber-fusion
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

```bash
kubectl apply -f cyber-fusion-deployment.yaml
```

#### 7. Configure Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rapid-force-ingress
  namespace: rapid-force
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - rapidforce.ai
    - api.rapidforce.ai
    secretName: rapid-force-tls
  rules:
  - host: rapidforce.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: cyber-fusion
            port:
              number: 80
  - host: api.rapidforce.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-server
            port:
              number: 3000
```

```bash
kubectl apply -f ingress.yaml
```

#### 8. Deploy using Helm (Optional)

```bash
# Add Helm repository
helm repo add rapid-force https://charts.rapidforce.ai
helm repo update

# Install chart
helm install rapid-force rapid-force/rapid-force \
  --namespace rapid-force \
  --set image.tag=latest \
  --set postgresql.password=your-password \
  --set jwtSecret=your-jwt-secret
```

### Scaling

```bash
# Scale API server
kubectl scale deployment api-server --replicas=5 -n rapid-force

# Scale frontend
kubectl scale deployment cyber-fusion --replicas=3 -n rapid-force
```

### Auto-scaling

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: rapid-force
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```bash
kubectl apply -f hpa.yaml
```

## Cloud Platform Deployment

### AWS Deployment

#### 1. EKS Cluster Setup

```bash
# Create EKS cluster
eksctl create cluster \
  --name rapid-force \
  --region us-east-1 \
  --nodes 3 \
  --node-type t3.large \
  --managed
```

#### 2. RDS PostgreSQL

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier rapid-force-db \
  --db-instance-class db.t3.large \
  --engine postgres \
  --engine-version 15.4 \
  --allocated-storage 100 \
  --master-username rapid_force \
  --master-user-password your-password \
  --vpc-security-group-ids sg-12345678
```

#### 3. ElastiCache Redis

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id rapid-force-redis \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids sg-12345678
```

#### 4. Load Balancer

```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
  --name rapid-force-alb \
  --subnets subnet-12345678 subnet-87654321 \
  --security-groups sg-12345678
```

#### 5. S3 for Static Assets

```bash
# Create S3 bucket
aws s3 mb s3://rapid-force-assets \
  --region us-east-1

# Configure bucket for static hosting
aws s3 website s3://rapid-force-assets \
  --index-document index.html
```

### GCP Deployment

#### 1. GKE Cluster Setup

```bash
# Create GKE cluster
gcloud container clusters create rapid-force \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10
```

#### 2. Cloud SQL PostgreSQL

```bash
# Create Cloud SQL instance
gcloud sql instances create rapid-force-db \
  --tier db-n1-standard-2 \
  --database-version POSTGRES_15 \
  --region us-central1
```

#### 3. Memorystore Redis

```bash
# Create Redis instance
gcloud redis instances create rapid-force-redis \
  --region us-central1 \
  --tier standard \
  --memory-size_gb 4
```

#### 4. Cloud Load Balancing

```bash
# Create load balancer
gcloud compute url-maps create rapid-force-lb \
  --default-service rapid-force-backend
```

### Azure Deployment

#### 1. AKS Cluster Setup

```bash
# Create AKS cluster
az aks create \
  --resource-group rapid-force-rg \
  --name rapid-force \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10
```

#### 2. Azure Database for PostgreSQL

```bash
# Create PostgreSQL server
az postgres server create \
  --resource-group rapid-force-rg \
  --name rapid-force-db \
  --location eastus \
  --admin-user rapid_force \
  --admin-password your-password \
  --sku-name GP_Gen5_2
```

#### 3. Azure Cache for Redis

```bash
# Create Redis cache
az redis create \
  --resource-group rapid-force-rg \
  --name rapid-force-redis \
  --location eastus \
  --sku Basic \
  --vm-size c0 \
  --enable-non-ssl-port
```

## Environment Configuration

### Production Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/rapid_force
DB_POOL_MIN=5
DB_POOL_MAX=20

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# Authentication
JWT_SECRET=your-production-secret
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# AI Services
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key

# Feature Flags
ENABLE_AI_FEATURES=true
ENABLE_PLUGIN_MARKETPLACE=true
ENABLE_COMPLIANCE_REPORTING=true
```

## Database Migration

### Running Migrations

```bash
# Generate migration
pnpm db:generate

# Push schema changes
pnpm db:push

# Run in production
kubectl exec -it deployment/api-server -n rapid-force -- pnpm db:push
```

### Database Backup

```bash
# Backup PostgreSQL
kubectl exec -it deployment/postgres -n rapid-force -- pg_dump rapid_force > backup.sql

# Restore
kubectl exec -i deployment/postgres -n rapid-force -- psql rapid_force < backup.sql
```

## Monitoring & Logging

### Prometheus Setup

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: rapid-force
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'api-server'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - rapid-force
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: api-server
```

### Grafana Dashboards

Import pre-configured dashboards for:
- API performance
- Database metrics
- System resources
- Security metrics
- Business metrics

### Log Aggregation

```yaml
# fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: rapid-force
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type json
      </parse>
    </source>
```

## Security Hardening

### Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rapid-force-network-policy
  namespace: rapid-force
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: rapid-force
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: rapid-force
```

### Pod Security Standards

```yaml
# pod-security-policy.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rapid-force
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Secrets Management

Use Kubernetes Secrets or external secret managers:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

## Backup & Disaster Recovery

### Backup Strategy

1. **Database Backups**: Daily automated backups
2. **Configuration Backups**: Version control + snapshots
3. **Asset Backups**: S3/GCS with versioning
4. **Disaster Recovery**: Multi-region deployment

### Backup Script

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/rapid-force/$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
kubectl exec -it deployment/postgres -n rapid-force -- pg_dump rapid_force > $BACKUP_DIR/database.sql

# Backup Redis
kubectl exec -it deployment/redis -n rapid-force -- redis-cli SAVE
kubectl cp rapid-force/redis-0:/data/dump.rdb $BACKUP_DIR/redis.rdb

# Backup configurations
kubectl get configmaps -n rapid-force -o yaml > $BACKUP_DIR/configmaps.yaml
kubectl get secrets -n rapid-force -o yaml > $BACKUP_DIR/secrets.yaml

# Upload to S3
aws s3 sync $BACKUP_DIR s3://rapid-force-backups/$DATE
```

### Restore Procedure

```bash
#!/bin/bash
# restore.sh

DATE=$1
BACKUP_DIR="/backups/rapid-force/$DATE"

# Restore PostgreSQL
kubectl exec -i deployment/postgres -n rapid-force -- psql rapid_force < $BACKUP_DIR/database.sql

# Restore Redis
kubectl cp $BACKUP_DIR/redis.rdb rapid-force/redis-0:/data/dump.rdb
kubectl exec -it deployment/redis -n rapid-force -- redis-cli --raw BGSAVE

# Restore configurations
kubectl apply -f $BACKUP_DIR/configmaps.yaml
kubectl apply -f $BACKUP_DIR/secrets.yaml
```

## Performance Optimization

### Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_threats_severity ON threats(severity);

-- Configure connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '4GB';
```

### Caching Strategy

- Redis for session storage
- CDN for static assets
- Application-level caching
- Database query caching

### Load Testing

```bash
# Using k6
k6 run --vus 100 --duration 5m load-test.js

# Using Apache Bench
ab -n 10000 -c 100 https://api.rapidforce.ai/api/health
```

## Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod status
kubectl get pods -n rapid-force

# View pod logs
kubectl logs <pod-name> -n rapid-force

# Describe pod
kubectl describe pod <pod-name> -n rapid-force
```

#### Database Connection Issues
```bash
# Test database connectivity
kubectl exec -it deployment/api-server -n rapid-force -- psql $DATABASE_URL

# Check database service
kubectl get svc postgres -n rapid-force
```

#### High Memory Usage
```bash
# Check resource usage
kubectl top pods -n rapid-force

# Adjust resource limits
kubectl edit deployment api-server -n rapid-force
```

## Maintenance

### Rolling Updates

```bash
# Update image
kubectl set image deployment/api-server \
  api-server=your-registry/rapid-force-api-server:v1.1.0 \
  -n rapid-force

# Check rollout status
kubectl rollout status deployment/api-server -n rapid-force

# Rollback if needed
kubectl rollout undo deployment/api-server -n rapid-force
```

### Certificate Renewal

```bash
# Check certificate expiry
kubectl get certificate -n rapid-force

# Force renewal
kubectl annotate certificate rapid-force-tls \
  cert-manager.io/issue-temporary-certificate=true \
  -n rapid-force
```

## Cost Optimization

### Resource Rightsizing

```bash
# Analyze resource usage
kubectl top nodes
kubectl top pods -n rapid-force

# Adjust resource requests/limits
kubectl edit deployment api-server -n rapid-force
```

### Spot Instances

Use spot instances for non-critical workloads:
- Development environments
- Batch processing jobs
- Testing environments

---

For additional support, see the [Troubleshooting Guide](troubleshooting.md) or contact enterprise support.
