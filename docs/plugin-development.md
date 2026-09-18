# Plugin Development Guide

## Overview

Rapid Force Cyber Fusion supports a plugin architecture that allows developers to extend platform capabilities without modifying core services. This guide covers plugin development, testing, and deployment.

## Plugin Architecture

### Plugin Types

1. **Security Integrations** - EDR, SIEM, firewall integrations
2. **Intelligence Add-Ons** - Threat intel feeds, dark web monitoring
3. **AI Capability Plugins** - Custom AI models and analysis tools
4. **Automation Packs** - Prebuilt playbooks and workflows
5. **Offensive Security Plugins** - Breach simulation, red team tools
6. **Compliance & GRC Add-Ons** - Regulatory compliance frameworks
7. **Visualization Extensions** - Custom dashboards and reports

### Plugin Structure

```
my-plugin/
├── package.json          # Plugin metadata
├── plugin.config.json   # Plugin configuration
├── src/
│   ├── index.ts         # Main plugin entry point
│   ├── handlers/        # Event handlers
│   ├── api/             # API endpoints
│   └── lib/             # Utility libraries
├── docs/                # Plugin documentation
└── tests/               # Plugin tests
```

## Getting Started

### Prerequisites

- Node.js 18+
- TypeScript knowledge
- Rapid Force development environment
- Understanding of REST APIs

### Plugin Template

```bash
# Use plugin generator
npx @rapidforce/plugin-generator my-plugin

# Or create manually
mkdir my-plugin
cd my-plugin
npm init -y
npm install @rapidforce/plugin-sdk
```

## Plugin Configuration

### package.json

```json
{
  "name": "@rapidforce/plugin-my-plugin",
  "version": "1.0.0",
  "description": "My custom plugin",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "dependencies": {
    "@rapidforce/plugin-sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "rapidforce": {
    "type": "integration",
    "category": "security",
    "version": "1.0.0",
    "apiVersion": "2.0.0"
  }
}
```

### plugin.config.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Custom plugin description",
  "version": "1.0.0",
  "author": "Your Name",
  "license": "MIT",
  "type": "integration",
  "category": "security",
  "capabilities": [
    "event ingestion",
    "data enrichment",
    "response actions"
  ],
  "permissions": [
    "read:events",
    "write:incidents",
    "read:threats"
  ],
  "settings": {
    "apiKey": {
      "type": "string",
      "required": true,
      "description": "API key for external service"
    },
    "endpoint": {
      "type": "url",
      "required": true,
      "description": "External service endpoint"
    },
    "enableCache": {
      "type": "boolean",
      "default": true,
      "description": "Enable caching"
    }
  }
}
```

## Plugin Development

### Basic Plugin

```typescript
// src/index.ts
import { Plugin, PluginContext, EventHandler } from '@rapidforce/plugin-sdk';

export class MyPlugin implements Plugin {
  private context: PluginContext;
  private config: any;

  constructor(context: PluginContext, config: any) {
    this.context = context;
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.context.logger.info('Initializing My Plugin');
    
    // Validate configuration
    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }

    // Set up event handlers
    this.context.events.on('incident.created', this.handleIncidentCreated.bind(this));
    
    this.context.logger.info('My Plugin initialized successfully');
  }

  async handleIncidentCreated(event: any): Promise<void> {
    this.context.logger.info(`Handling incident: ${event.id}`);
    
    // Process incident
    const enriched = await this.enrichIncident(event);
    
    // Update incident
    await this.context.api.incidents.update(event.id, enriched);
  }

  private async enrichIncident(incident: any): Promise<any> {
    // Enrich incident with external data
    const externalData = await this.fetchExternalData(incident);
    
    return {
      ...incident,
      enriched: true,
      externalData
    };
  }

  private async fetchExternalData(incident: any): Promise<any> {
    const response = await fetch(`${this.config.endpoint}/api/data`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });
    
    return response.json();
  }

  async shutdown(): Promise<void> {
    this.context.logger.info('Shutting down My Plugin');
    // Cleanup resources
  }
}

export default MyPlugin;
```

### Event Handlers

```typescript
// src/handlers/index.ts
import { EventHandler, PluginContext } from '@rapidforce/plugin-sdk';

export class ThreatHandler implements EventHandler {
  constructor(private context: PluginContext) {}

  async handle(event: any): Promise<void> {
    switch (event.type) {
      case 'threat.detected':
        await this.handleThreatDetected(event);
        break;
      case 'threat.updated':
        await this.handleThreatUpdated(event);
        break;
      default:
        this.context.logger.warn(`Unknown event type: ${event.type}`);
    }
  }

  private async handleThreatDetected(event: any): Promise<void> {
    // Process threat detection
    const enriched = await this.enrichThreat(event.data);
    
    // Create or update threat in system
    await this.context.api.threats.upsert(enriched);
  }

  private async handleThreatUpdated(event: any): Promise<void> {
    // Process threat update
    const updated = await this.updateThreat(event.data);
    
    // Update threat in system
    await this.context.api.threats.update(event.data.id, updated);
  }

  private async enrichThreat(threat: any): Promise<any> {
    // Enrich with external threat intelligence
    const intel = await this.fetchThreatIntel(threat.iocs);
    
    return {
      ...threat,
      intelligence: intel,
      enrichedAt: new Date().toISOString()
    };
  }

  private async updateThreat(threat: any): Promise<any> {
    // Update threat with new information
    return {
      ...threat,
      updatedAt: new Date().toISOString()
    };
  }

  private async fetchThreatIntel(iocs: string[]): Promise<any> {
    // Fetch threat intelligence from external source
    // Implementation depends on plugin type
    return {};
  }
}
```

### API Endpoints

```typescript
// src/api/index.ts
import { Router } from 'express';
import { PluginContext } from '@rapidforce/plugin-sdk';

export function createApiRouter(context: PluginContext): Router {
  const router = Router();

  // Custom endpoint
  router.get('/plugin/my-plugin/status', async (req, res) => {
    try {
      const status = await getPluginStatus(context);
      res.json({ success: true, data: status });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Webhook endpoint
  router.post('/plugin/my-plugin/webhook', async (req, res) => {
    try {
      await handleWebhook(req.body, context);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

async function getPluginStatus(context: PluginContext): Promise<any> {
  // Return plugin status
  return {
    status: 'active',
    version: '1.0.0',
    lastActivity: new Date().toISOString()
  };
}

async function handleWebhook(data: any, context: PluginContext): Promise<void> {
  // Handle webhook from external service
  context.logger.info('Received webhook', data);
  
  // Process webhook data
  await context.api.events.create({
    type: 'webhook.received',
    source: 'my-plugin',
    data
  });
}
```

## Plugin SDK

### Context API

```typescript
interface PluginContext {
  // Logging
  logger: {
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
  };

  // Configuration
  config: {
    get(key: string): any;
    set(key: string, value: any): void;
  };

  // Events
  events: {
    on(event: string, handler: EventHandler): void;
    emit(event: string, data: any): void;
    off(event: string, handler: EventHandler): void;
  };

  // API
  api: {
    incidents: IncidentAPI;
    threats: ThreatAPI;
    detections: DetectionAPI;
    users: UserAPI;
    // ... other APIs
  };

  // Storage
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // HTTP client
  http: {
    get(url: string, options?: RequestOptions): Promise<Response>;
    post(url: string, data: any, options?: RequestOptions): Promise<Response>;
    put(url: string, data: any, options?: RequestOptions): Promise<Response>;
    delete(url: string, options?: RequestOptions): Promise<Response>;
  };
}
```

### Utility Functions

```typescript
import { 
  validateConfig, 
  encryptData, 
  decryptData,
  rateLimit,
  retry 
} from '@rapidforce/plugin-sdk';

// Validate configuration
const isValid = validateConfig(config, schema);

// Encrypt sensitive data
const encrypted = await encryptData('sensitive-data', 'encryption-key');

// Decrypt data
const decrypted = await decryptData(encrypted, 'encryption-key');

// Rate limiting
const limited = rateLimit(100, 60000); // 100 requests per minute

// Retry with exponential backoff
const result = await retry(async () => {
  return fetchExternalData();
}, { maxRetries: 3, backoff: 1000 });
```

## Testing

### Unit Tests

```typescript
// tests/plugin.test.ts
import { MyPlugin } from '../src/index';
import { MockPluginContext } from '@rapidforce/plugin-sdk/testing';

describe('MyPlugin', () => {
  let plugin: MyPlugin;
  let context: MockPluginContext;

  beforeEach(() => {
    context = new MockPluginContext();
    plugin = new MyPlugin(context, {
      apiKey: 'test-key',
      endpoint: 'https://api.example.com'
    });
  });

  it('should initialize successfully', async () => {
    await plugin.initialize();
    expect(context.logger.info).toHaveBeenCalledWith('Initializing My Plugin');
  });

  it('should handle incident created event', async () => {
    await plugin.initialize();
    
    const event = {
      type: 'incident.created',
      data: {
        id: 1,
        title: 'Test Incident'
      }
    };

    await plugin.handleIncidentCreated(event);
    
    expect(context.api.incidents.update).toHaveBeenCalled();
  });

  it('should fail without API key', async () => {
    const invalidPlugin = new MyPlugin(context, {
      endpoint: 'https://api.example.com'
    });

    await expect(invalidPlugin.initialize()).rejects.toThrow('API key is required');
  });
});
```

### Integration Tests

```typescript
// tests/integration.test.ts
import { MyPlugin } from '../src/index';
import { TestPluginContext } from '@rapidforce/plugin-sdk/testing';

describe('MyPlugin Integration', () => {
  let plugin: MyPlugin;
  let context: TestPluginContext;

  beforeAll(async () => {
    context = new TestPluginContext();
    plugin = new MyPlugin(context, {
      apiKey: process.env.TEST_API_KEY,
      endpoint: process.env.TEST_ENDPOINT
    });
    
    await plugin.initialize();
  });

  afterAll(async () => {
    await plugin.shutdown();
  });

  it('should enrich incident with external data', async () => {
    const incident = {
      id: 1,
      title: 'Test Incident',
      iocs: ['192.168.1.1']
    };

    const enriched = await plugin.enrichIncident(incident);
    
    expect(enriched.enriched).toBe(true);
    expect(enriched.externalData).toBeDefined();
  });
});
```

## Building and Packaging

### Build Process

```bash
# Install dependencies
npm install

# Build plugin
npm run build

# The output will be in dist/ directory
```

### Package for Distribution

```bash
# Create distribution package
npm pack

# This creates a .tgz file that can be uploaded to the marketplace
```

## Deployment

### Local Testing

```bash
# Start Rapid Force with plugin
pnpm dev --plugin ./my-plugin

# Or use plugin configuration
# Add to plugin.config.json in platform
```

### Marketplace Submission

1. **Prepare Plugin**
   - Ensure all tests pass
   - Update documentation
   - Create plugin icon (256x256)
   - Prepare screenshots

2. **Create Listing**
   - Go to Plugin Marketplace
   - Click "Submit Plugin"
   - Fill in plugin details
   - Upload plugin package

3. **Review Process**
   - Automated validation
   - Security review
   - Manual review
   - Approval and publication

## Best Practices

### Security

- Never hardcode secrets
- Use environment variables for sensitive data
- Validate all input data
- Implement rate limiting
- Use encryption for sensitive data storage

### Performance

- Implement caching where appropriate
- Use async/await for I/O operations
- Implement proper error handling
- Add monitoring and logging
- Optimize database queries

### Error Handling

```typescript
try {
  const result = await externalApiCall();
  return result;
} catch (error) {
  this.context.logger.error('API call failed', error);
  
  // Implement retry logic
  if (isRetryable(error)) {
    return retryWithBackoff(externalApiCall);
  }
  
  throw error;
}
```

### Logging

```typescript
// Use appropriate log levels
this.context.logger.debug('Detailed debug information');
this.context.logger.info('Normal operation information');
this.context.logger.warn('Warning conditions');
this.context.logger.error('Error conditions', error);
```

## Plugin Examples

### Security Integration Plugin

```typescript
// EDR Integration Plugin
export class EDRPlugin implements Plugin {
  async handleThreatDetected(event: any): Promise<void> {
    // Get endpoint details from EDR
    const endpoint = await this.context.api.edr.getEndpoint(event.hostname);
    
    // Isolate endpoint if high severity
    if (event.severity === 'critical') {
      await this.context.api.edr.isolateEndpoint(endpoint.id);
    }
    
    // Collect forensic artifacts
    const artifacts = await this.context.api.edr.collectArtifacts(endpoint.id);
    
    // Attach to incident
    await this.context.api.incidents.update(event.incidentId, {
      artifacts
    });
  }
}
```

### Intelligence Feed Plugin

```typescript
// Threat Intelligence Feed Plugin
export class ThreatIntelPlugin implements Plugin {
  async pollFeed(): Promise<void> {
    const threats = await this.fetchThreats();
    
    for (const threat of threats) {
      await this.context.api.threats.create({
        ...threat,
        source: 'threat-intel-feed'
      });
    }
  }

  private async fetchThreats(): Promise<any[]> {
    const response = await this.context.http.get(
      `${this.config.endpoint}/api/threats`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      }
    );
    
    return response.json();
  }
}
```

### Automation Pack Plugin

```typescript
// Ransomware Response Playbook
export class RansomwareResponsePlugin implements Plugin {
  async executePlaybook(incident: any): Promise<void> {
    // Step 1: Isolate affected systems
    await this.isolateSystems(incident);
    
    // Step 2: Disable compromised accounts
    await this.disableAccounts(incident);
    
    // Step 3: Block malicious IPs
    await this.blockIPs(incident);
    
    // Step 4: Collect forensic evidence
    await this.collectEvidence(incident);
    
    // Step 5: Notify security team
    await this.notifyTeam(incident);
  }

  private async isolateSystems(incident: any): Promise<void> {
    for (const host of incident.affectedHosts) {
      await this.context.api.edr.isolateEndpoint(host.id);
    }
  }

  // ... other steps
}
```

## Troubleshooting

### Common Issues

#### Plugin Won't Load

**Problem:** Plugin fails to initialize

**Solutions:**
1. Check plugin configuration is valid
2. Verify all required dependencies are installed
3. Check plugin logs for error messages
4. Ensure plugin API version is compatible

#### Events Not Received

**Problem:** Plugin not receiving events

**Solutions:**
1. Verify event handler is registered
2. Check event name matches expected format
3. Ensure plugin has required permissions
4. Check event filter configuration

#### API Calls Failing

**Problem:** API calls to external service failing

**Solutions:**
1. Verify API credentials are valid
2. Check network connectivity
3. Implement retry logic with exponential backoff
4. Add proper error handling and logging

## Resources

### Documentation

- [Plugin SDK Reference](https://docs.rapidforce.ai/plugin-sdk)
- [API Documentation](api.md)
- [Development Guide](development.md)

### Community

- [Plugin Development Forum](https://forum.rapidforce.ai/plugins)
- [Discord Plugin Channel](https://discord.gg/rapidforce)
- [Plugin Examples](https://github.com/rapidforce-plugins)

### Support

- **Email**: plugins@rapidforce.ai
- **Documentation**: https://docs.rapidforce.ai/plugins
- **Issues**: https://github.com/rapidforce-cyber-fusion/issues

---

For additional support, see the main [Contributing Guidelines](contributing.md) or contact the plugin development team.
