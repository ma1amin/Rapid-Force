# Troubleshooting Guide

## Common Issues and Solutions

This guide provides solutions to common issues encountered during development, deployment, and operation of Rapid Force Cyber Fusion.

## Development Issues

### Installation Problems

#### Dependency Installation Fails

**Problem:**
```bash
pnpm install
# Error: Cannot resolve dependency
```

**Solutions:**
1. Clear pnpm cache:
```bash
pnpm store prune
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

2. Check Node.js version:
```bash
node --version  # Should be 18+
```

3. Use legacy peer dependencies:
```bash
pnpm install --legacy-peer-deps
```

#### TypeScript Compilation Errors

**Problem:**
```bash
pnpm typecheck
# Error: Type 'X' is not assignable to type 'Y'
```

**Solutions:**
1. Clean build artifacts:
```bash
rm -rf artifacts/*/dist
pnpm build
```

2. Check TypeScript version consistency:
```bash
pnpm list typescript
```

3. Update type definitions:
```bash
pnpm add -D @types/node
```

### Database Issues

#### Database Connection Failed

**Problem:**
```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
1. Check PostgreSQL status:
```bash
# Docker
docker-compose ps postgres

# Local
sudo systemctl status postgresql
```

2. Verify connection string in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/rapid_force
```

3. Test connection manually:
```bash
psql postgresql://user:password@localhost:5432/rapid_force
```

#### Migration Errors

**Problem:**
```bash
pnpm db:push
# Error: relation already exists
```

**Solutions:**
1. Reset database (caution: deletes data):
```bash
pnpm db:reset
```

2. Manual schema sync:
```bash
pnpm db:generate
pnpm db:push
```

3. Check for conflicting migrations:
```bash
# Review migration files
ls lib/db/src/schema/
```

### API Server Issues

#### Port Already in Use

**Problem:**
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
1. Find and kill process:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

2. Use different port:
```env
PORT=3001
```

#### Authentication Token Errors

**Problem:**
```json
{
  "error": "Invalid token"
}
```

**Solutions:**
1. Verify JWT secret in `.env`:
```env
JWT_SECRET=your-secret-key
```

2. Check token expiration:
```bash
# Decode JWT to check exp claim
echo <token> | jwt decode
```

3. Regenerate token:
```bash
# Login again to get new token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### Frontend Issues

#### Build Fails

**Problem:**
```bash
pnpm build
# Error: Module not found
```

**Solutions:**
1. Clear Vite cache:
```bash
rm -rf node_modules/.vite
pnpm build
```

2. Check for circular dependencies:
```bash
# Use madge to detect circular dependencies
npx madge --circular artifacts/cyber-fusion/src
```

3. Verify imports:
```bash
# Check for missing imports
grep -r "import.*from" artifacts/cyber-fusion/src
```

#### API Connection Errors

**Problem:**
```bash
Error: Network request failed
```

**Solutions:**
1. Check API server is running:
```bash
curl http://localhost:3000/api/health
```

2. Verify API URL in `.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

3. Check CORS configuration:
```typescript
// artifacts/api-server/src/app.ts
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

## Deployment Issues

### Docker Issues

#### Container Won't Start

**Problem:**
```bash
docker-compose up
# Error: Container exited with code 1
```

**Solutions:**
1. Check container logs:
```bash
docker-compose logs api-server
```

2. Verify environment variables:
```bash
docker-compose config
```

3. Rebuild containers:
```bash
docker-compose up --build
```

#### Database Connection in Docker

**Problem:**
```bash
Error: getaddrinfo ENOTFOUND postgres
```

**Solutions:**
1. Check Docker network:
```bash
docker network ls
docker network inspect rapid-force_default
```

2. Use service name in connection string:
```env
DATABASE_URL=postgresql://user:password@postgres:5432/rapid_force
```

3. Wait for database to be ready:
```yaml
# docker-compose.yml
depends_on:
  postgres:
    condition: service_healthy
```

### Kubernetes Issues

#### Pod Won't Start

**Problem:**
```bash
kubectl get pods
# STATUS: CrashLoopBackOff
```

**Solutions:**
1. Check pod logs:
```bash
kubectl logs <pod-name> -n rapid-force
```

2. Describe pod for details:
```bash
kubectl describe pod <pod-name> -n rapid-force
```

3. Check resource limits:
```bash
kubectl top pods -n rapid-force
```

#### Image Pull Errors

**Problem:**
```bash
Failed to pull image "your-registry/image:tag"
```

**Solutions:**
1. Check image exists:
```bash
docker pull your-registry/image:tag
```

2. Verify registry credentials:
```bash
kubectl create secret docker-registry regcred \
  --docker-server=your-registry \
  --docker-username=username \
  --docker-password=password
```

3. Update image pull secret:
```yaml
spec:
  imagePullSecrets:
  - name: regcred
```

#### Persistent Volume Issues

**Problem:**
```bash
pod has unbound immediate PersistentVolumeClaims
```

**Solutions:**
1. Check PVC status:
```bash
kubectl get pvc -n rapid-force
```

2. Verify storage class:
```bash
kubectl get storageclass
```

3. Create PV manually if needed:
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: standard
```

### Cloud Platform Issues

#### AWS Deployment Failures

**Problem:**
```bash
Error: User is not authorized to perform: eks:CreateCluster
```

**Solutions:**
1. Check IAM permissions:
```bash
aws iam get-user-policy --user-name <username> --policy-name <policy-name>
```

2. Attach required policies:
```bash
aws iam attach-user-policy --user-name <username> --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
```

3. Verify AWS credentials:
```bash
aws sts get-caller-identity
```

#### GCP Deployment Failures

**Problem:**
```bash
ERROR: (gcloud.container.clusters.create) ResponseError: status=403
```

**Solutions:**
1. Check GCP permissions:
```bash
gcloud projects get-iam-policy <project-id>
```

2. Enable required APIs:
```bash
gcloud services enable container.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

3. Verify authentication:
```bash
gcloud auth list
```

## Performance Issues

### Slow API Response Times

**Problem:**
API endpoints responding slowly (>1s)

**Solutions:**
1. Check database query performance:
```sql
EXPLAIN ANALYZE SELECT * FROM incidents WHERE status = 'open';
```

2. Add database indexes:
```sql
CREATE INDEX idx_incidents_status ON incidents(status);
```

3. Enable query caching:
```typescript
// Redis caching middleware
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

4. Implement connection pooling:
```typescript
// Database connection pool
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### High Memory Usage

**Problem:**
```bash
kubectl top pods
# MEMORY: 2Gi (limit: 1Gi)
```

**Solutions:**
1. Profile memory usage:
```bash
node --inspect artifacts/api-server/dist/index.js
```

2. Check for memory leaks:
```bash
# Use clinic.js
npx clinic heapprofiler -- node artifacts/api-server/dist/index.js
```

3. Implement memory limits:
```yaml
resources:
  limits:
    memory: "2Gi"
  requests:
    memory: "1Gi"
```

4. Optimize data processing:
```typescript
// Stream large datasets instead of loading all at once
const stream = db.select().from(largeTable).stream();
```

### Database Performance Issues

**Problem:**
Slow database queries, high CPU usage

**Solutions:**
1. Analyze slow queries:
```sql
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

2. Update database statistics:
```sql
ANALYZE;
VACUUM ANALYZE;
```

3. Optimize queries:
```sql
-- Use specific columns instead of SELECT *
SELECT id, name FROM users WHERE email = 'user@example.com';
```

4. Implement read replicas:
```yaml
# PostgreSQL read replica configuration
postgresql:
  replication:
    enabled: true
    readReplicas:
      - name: read-replica-1
```

## Security Issues

### Authentication Failures

**Problem:**
Users unable to authenticate

**Solutions:**
1. Check JWT configuration:
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

2. Verify user account status:
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

3. Check authentication logs:
```bash
kubectl logs deployment/api-server -n rapid-force | grep auth
```

### Permission Errors

**Problem:**
```json
{
  "error": "Forbidden"
}
```

**Solutions:**
1. Verify user role:
```sql
SELECT role FROM users WHERE id = 1;
```

2. Check role permissions:
```typescript
// Verify role has required permission
if (!hasPermission(user.role, 'incidents:resolve')) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

3. Update user role if needed:
```sql
UPDATE users SET role = 'admin' WHERE id = 1;
```

### Security Vulnerabilities

**Problem:**
Security scanner detects vulnerabilities

**Solutions:**
1. Update dependencies:
```bash
pnpm update
```

2. Run security audit:
```bash
pnpm audit
pnpm audit fix
```

3. Manually patch vulnerable packages:
```bash
pnpm add package@safe-version
```

## Integration Issues

### Plugin Installation Failures

**Problem:**
Plugin won't install or configure

**Solutions:**
1. Check plugin compatibility:
```bash
# Verify plugin version compatibility
cat plugin/package.json | grep version
```

2. Review plugin logs:
```bash
kubectl logs deployment/plugin-gateway -n rapid-force
```

3. Verify plugin configuration:
```typescript
// Check plugin config schema
const pluginConfig = z.object({
  apiKey: z.string(),
  endpoint: z.url(),
});
```

### External API Integration Errors

**Problem:**
External API calls failing

**Solutions:**
1. Test API connectivity:
```bash
curl -X POST https://external-api.com/endpoint \
  -H "Authorization: Bearer token"
```

2. Check rate limits:
```typescript
// Implement rate limiting
const rateLimiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'minute',
});
```

3. Add retry logic:
```typescript
// Exponential backoff
const retryWithBackoff = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

## Monitoring Issues

### Missing Metrics

**Problem:**
Metrics not appearing in monitoring dashboard

**Solutions:**
1. Check Prometheus configuration:
```yaml
scrape_configs:
  - job_name: 'api-server'
    static_configs:
      - targets: ['api-server:3000']
```

2. Verify metrics endpoint:
```bash
curl http://localhost:3000/metrics
```

3. Check service discovery:
```bash
kubectl get endpoints -n rapid-force
```

### Log Aggregation Issues

**Problem:**
Logs not appearing in centralized logging

**Solutions:**
1. Check log shipping configuration:
```yaml
# fluentd configuration
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd-containers.log.pos
</source>
```

2. Verify log format:
```typescript
// Ensure structured logging
logger.info({
  message: 'User logged in',
  userId: user.id,
  timestamp: new Date().toISOString()
});
```

3. Check log permissions:
```bash
ls -la /var/log/containers/
```

## Backup and Recovery Issues

### Backup Failures

**Problem:**
Automated backups failing

**Solutions:**
1. Check backup logs:
```bash
kubectl logs job/backup-job -n rapid-force
```

2. Verify storage permissions:
```bash
kubectl get pvc -n rapid-force
```

3. Test backup manually:
```bash
kubectl exec -it deployment/postgres -n rapid-force -- pg_dump rapid_force > test-backup.sql
```

### Restore Failures

**Problem:**
Unable to restore from backup

**Solutions:**
1. Verify backup integrity:
```bash
# Check SQL file is valid
head -n 20 backup.sql
```

2. Check database version compatibility:
```bash
psql --version
# Ensure compatible with backup
```

3. Restore to clean database:
```bash
# Drop and recreate database
kubectl exec -it deployment/postgres -n rapid-force -- psql -c "DROP DATABASE rapid_force;"
kubectl exec -it deployment/postgres -n rapid-force -- psql -c "CREATE DATABASE rapid_force;"
kubectl exec -i deployment/postgres -n rapid-force -- psql rapid_force < backup.sql
```

## Getting Help

### Support Channels

- **Documentation**: Check this guide and other docs
- **GitHub Issues**: Search existing issues or create new one
- **Community**: Join Discord server for community support
- **Enterprise Support**: Contact enterprise@rapidforce.ai

### Information to Provide

When reporting issues, include:

1. **Environment Information:**
   - Operating system and version
   - Node.js version
   - Docker/Kubernetes version
   - Cloud platform (if applicable)

2. **Error Messages:**
   - Full error output
   - Stack traces
   - Log excerpts

3. **Steps to Reproduce:**
   - Detailed steps
   - Configuration files
   - Input data

4. **Expected vs Actual Behavior:**
   - What you expected to happen
   - What actually happened
   - Screenshots if applicable

### Debug Mode

Enable debug logging for troubleshooting:

```env
# Enable debug logging
DEBUG=rapid-force:*
LOG_LEVEL=debug
```

```bash
# Run with debug output
DEBUG=* pnpm dev
```

## Prevention

### Best Practices

1. **Regular Testing:**
   - Test in staging before production
   - Run integration tests
   - Perform load testing

2. **Monitoring:**
   - Set up alerts for common issues
   - Monitor system resources
   - Track error rates

3. **Documentation:**
   - Document custom configurations
   - Keep changelog of changes
   - Maintain runbooks

4. **Backup Strategy:**
   - Regular automated backups
   - Test restore procedures
   - Keep backups in multiple locations

---

For additional support, see the [Deployment Guide](deployment.md) or contact enterprise support.
