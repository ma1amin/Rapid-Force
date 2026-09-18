# API Documentation

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.rapidforce.ai/api
```

## Authentication

Most endpoints require authentication using JWT tokens.

### Authentication Flow

1. **Login**: POST `/auth/login` with credentials
2. **Receive Token**: JWT token returned in response
3. **Use Token**: Include token in Authorization header

```bash
Authorization: Bearer <your-jwt-token>
```

### Example

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"
```

## Rate Limiting

- **Default**: 100 requests per minute
- **Authenticated**: 1000 requests per minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

## Endpoints

### Authentication

#### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "analyst"
    }
  }
}
```

#### Register
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password",
  "displayName": "John Doe",
  "tenantSlug": "organization"
}
```

#### Logout
```http
POST /auth/logout
```

**Headers:** `Authorization: Bearer <token>`

#### Refresh Token
```http
POST /auth/refresh
```

**Headers:** `Authorization: Bearer <token>`

### Users

#### Get Current User
```http
GET /users/me
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "analyst",
    "tenantId": 1,
    "lastLoginAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Users
```http
GET /users
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `role` (optional filter)
- `search` (optional search)

#### Create User
```http
POST /users
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password",
  "displayName": "Jane Doe",
  "role": "analyst"
}
```

#### Update User
```http
PUT /users/:id
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "displayName": "Updated Name",
  "role": "admin"
}
```

#### Delete User
```http
DELETE /users/:id
```

**Headers:** `Authorization: Bearer <token>`

### Tenants

#### Get Tenants
```http
GET /tenants
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `tier` (optional filter)

#### Get Tenant
```http
GET /tenants/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Create Tenant
```http
POST /tenants
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Organization Name",
  "slug": "organization",
  "tier": "professional"
}
```

#### Update Tenant
```http
PUT /tenants/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Delete Tenant
```http
DELETE /tenants/:id
```

**Headers:** `Authorization: Bearer <token>`

### Agents

#### Get Agents
```http
GET /agents
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "SOC Analyst Agent",
      "type": "analyst",
      "status": "active",
      "capabilities": ["incident-response", "threat-hunting"],
      "lastActivity": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Agent
```http
GET /agents/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Create Agent
```http
POST /agents
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Custom Agent",
  "type": "analyst",
  "capabilities": ["custom-task"],
  "config": { ... }
}
```

#### Update Agent
```http
PUT /agents/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Delete Agent
```http
DELETE /agents/:id
```

**Headers:** `Authorization: Bearer <token>`

### AI Agents

#### Get AI Agents
```http
GET /ai-agents
```

**Headers:** `Authorization: Bearer <token>`

#### Get AI Agent
```http
GET /ai-agents/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Create AI Agent
```http
POST /ai-agents
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Custom AI Agent",
  "role": "threat-hunter",
  "prompt": "System prompt...",
  "model": "gpt-4",
  "capabilities": ["analysis", "recommendation"]
}
```

#### Execute AI Agent
```http
POST /ai-agents/:id/execute
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "task": "Analyze this incident",
  "context": { ... }
}
```

### Threats

#### Get Threats
```http
GET /threats
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `severity` (low, medium, high, critical)
- `status` (active, resolved, false_positive)
- `type` (malware, phishing, ddos, etc.)
- `page` (default: 1)
- `limit` (default: 20)

#### Get Threat
```http
GET /threats/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Create Threat
```http
POST /threats
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Threat Title",
  "description": "Threat description",
  "severity": "high",
  "type": "malware",
  "source": "internal",
  "iocs": ["192.168.1.1", "malware.exe"]
}
```

#### Update Threat
```http
PUT /threats/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Delete Threat
```http
DELETE /threats/:id
```

**Headers:** `Authorization: Bearer <token>`

### Detections

#### Get Detections
```http
GET /detections
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `ruleId` (optional filter)
- `severity` (optional filter)
- `status` (active, disabled)
- `page` (default: 1)
- `limit` (default: 20)

#### Get Detection
```http
GET /detections/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Create Detection
```http
POST /detections
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Detection Rule",
  "type": "sigma",
  "content": "rule content",
  "severity": "high",
  "mitreTactics": ["initial-access"],
  "mitreTechniques": ["T1566"]
}
```

#### Update Detection
```http
PUT /detections/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Delete Detection
```http
DELETE /detections/:id
```

**Headers:** `Authorization: Bearer <token>`

### Incidents

#### Get Incidents
```http
GET /incidents
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `severity` (low, medium, high, critical)
- `status` (open, investigating, resolved, closed)
- `assignedTo` (optional filter)
- `page` (default: 1)
- `limit` (default: 20)

#### Get Incident
```http
GET /incidents/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Incident Title",
    "description": "Incident description",
    "severity": "high",
    "status": "investigating",
    "assignedTo": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "timeline": [ ... ],
    "actions": [ ... ]
  }
}
```

#### Create Incident
```http
POST /incidents
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Incident Title",
  "description": "Incident description",
  "severity": "high",
  "sourceDetectionId": 1
}
```

#### Update Incident
```http
PUT /incidents/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Delete Incident
```http
DELETE /incidents/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Incident Actions

##### Isolate Host
```http
POST /incidents/:id/actions/isolate-host
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "hostname": "target-host",
  "reason": "Security incident"
}
```

##### Block IP
```http
POST /incidents/:id/actions/block-ip
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "ip": "192.168.1.1",
  "reason": "Malicious activity"
}
```

##### Quarantine File
```http
POST /incidents/:id/actions/quarantine
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "fileHash": "abc123",
  "filePath": "/path/to/file"
}
```

### Playbooks

#### Get Playbooks
```http
GET /playbooks
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `category` (optional filter)
- `status` (active, draft, archived)
- `page` (default: 1)
- `limit` (default: 20)

#### Get Playbook
```http
GET /playbooks/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Create Playbook
```http
POST /playbooks
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Playbook Name",
  "description": "Playbook description",
  "category": "incident-response",
  "steps": [
    {
      "name": "Step 1",
      "action": "isolate-host",
      "parameters": { ... }
    }
  ]
}
```

#### Update Playbook
```http
PUT /playbooks/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Delete Playbook
```http
DELETE /playbooks/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Execute Playbook
```http
POST /playbooks/:id/execute
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "incidentId": 1,
  "parameters": { ... }
}
```

### Sprints

#### Get Sprints
```http
GET /sprints
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (planned, active, completed)
- `page` (default: 1)
- `limit` (default: 20)

#### Get Sprint
```http
GET /sprints/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Create Sprint
```http
POST /sprints
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Sprint Name",
  "description": "Sprint description",
  "startDate": "2024-01-01",
  "endDate": "2024-01-07",
  "goals": ["Goal 1", "Goal 2"]
}
```

#### Update Sprint
```http
PUT /sprints/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Delete Sprint
```http
DELETE /sprints/:id
```

**Headers:** `Authorization: Bearer <token>`

### Missions

#### Get Missions
```http
GET /missions
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (pending, in_progress, completed, failed)
- `agentId` (optional filter)
- `page` (default: 1)
- `limit` (default: 20)

#### Get Mission
```http
GET /missions/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Create Mission
```http
POST /missions
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Mission Name",
  "description": "Mission description",
  "agentId": 1,
  "parameters": { ... }
}
```

#### Update Mission
```http
PUT /missions/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Delete Mission
```http
DELETE /missions/:id
```

**Headers:** `Authorization: Bearer <token>`

### Activity

#### Get Activity
```http
GET /activity
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `userId` (optional filter)
- `action` (optional filter)
- `page` (default: 1)
- `limit` (default: 20)

### Compliance

#### Get Compliance Frameworks
```http
GET /compliance/frameworks
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "nca-saudi",
      "name": "NCA Saudi",
      "description": "National Cyber Authority compliance",
      "controls": [ ... ]
    },
    {
      "id": "iso-27001",
      "name": "ISO 27001",
      "description": "Information security management",
      "controls": [ ... ]
    }
  ]
}
```

#### Get Compliance Status
```http
GET /compliance/status
```

**Headers:** `Authorization: Bearer <token>`

#### Generate Compliance Report
```http
POST /compliance/reports
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "framework": "nca-saudi",
  "format": "pdf",
  "period": "2024-01"
}
```

### Plugins

#### Get Plugins
```http
GET /plugins
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `category` (optional filter)
- `status` (installed, available, built-in)
- `page` (default: 1)
- `limit` (default: 20)

#### Get Plugin
```http
GET /plugins/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Install Plugin
```http
POST /plugins/:id/install
```

**Headers:** `Authorization: Bearer <token>`

#### Uninstall Plugin
```http
POST /plugins/:id/uninstall
```

**Headers:** `Authorization: Bearer <token>`

#### Configure Plugin
```http
PUT /plugins/:id/configure
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "config": { ... }
}
```

### Executive Dashboard

#### Get Executive Metrics
```http
GET /executive/metrics
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalIncidents": 150,
    "resolvedIncidents": 120,
    "activeThreats": 25,
    "riskScore": 75,
    "mttd": "2h 30m",
    "mttr": "4h 15m"
  }
}
```

#### Get Executive Reports
```http
GET /executive/reports
```

**Headers:** `Authorization: Bearer <token>`

### Behavioral Analytics (UEBA)

#### Get UEBA Alerts
```http
GET /ueba/alerts
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `severity` (optional filter)
- `entityType` (user, host, application)
- `page` (default: 1)
- `limit` (default: 20)

#### Get UEBA Baselines
```http
GET /ueba/baselines
```

**Headers:** `Authorization: Bearer <token>`

### Predictive Early Warning System

#### Get EWS Alerts
```http
GET /ews/alerts
```

**Headers:** `Authorization: Bearer <token>`

#### Get Predictions
```http
GET /ews/predictions
```

**Headers:** `Authorization: Bearer <token>`

#### Escalate Alert
```http
POST /ews/alerts/:id/escalate
```

**Headers:** `Authorization: Bearer <token>`

### Copilot

#### Ask Copilot
```http
POST /copilot/ask
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "question": "How do I investigate this incident?",
  "context": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "To investigate this incident...",
    "sources": [ ... ],
    "confidence": 0.95
  }
}
```

### Admin Endpoints

#### Get Tenants (Admin)
```http
GET /admin/tenants
```

**Headers:** `Authorization: Bearer <token>`

**Requires:** Platform Admin role

#### Create Tenant (Admin)
```http
POST /admin/tenants
```

**Headers:** `Authorization: Bearer <token>`

**Requires:** Platform Admin role

#### Get Users (Admin)
```http
GET /admin/users
```

**Headers:** `Authorization: Bearer <token>`

**Requires:** Platform Admin role

#### Get Analytics (Admin)
```http
GET /admin/analytics
```

**Headers:** `Authorization: Bearer <token>`

**Requires:** Platform Admin role

#### Get Audit Log (Admin)
```http
GET /admin/audit-log
```

**Headers:** `Authorization: Bearer <token>`

**Requires:** Platform Admin role

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required or invalid token |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid input data |
| `CONFLICT` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Internal server error |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

## Webhooks

### Configure Webhook

```http
POST /webhooks
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["incident.created", "threat.detected"],
  "secret": "webhook-secret"
}
```

### Webhook Events

- `incident.created`
- `incident.updated`
- `threat.detected`
- `alert.generated`
- `playbook.executed`

## SDKs

### JavaScript/TypeScript

```typescript
import { RapidForceClient } from '@rapidforce/sdk';

const client = new RapidForceClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.rapidforce.ai/api'
});

const incidents = await client.incidents.list();
```

### Python

```python
from rapidforce import RapidForceClient

client = RapidForceClient(
    api_key='your-api-key',
    base_url='https://api.rapidforce.ai/api'
)

incidents = client.incidents.list()
```

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Core authentication and authorization
- User and tenant management
- Agent and AI agent endpoints
- Threat and detection management
- Incident response automation
- Playbook execution
- Compliance framework integration

---

For more information, see the [Development Guide](development.md) or contact support.
