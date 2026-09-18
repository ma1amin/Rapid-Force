# Development Guide

## Development Environment Setup

### Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **pnpm**: 8+ (package manager)
- **PostgreSQL**: 15+ (local or Docker)
- **Docker**: 20+ (for containerized services)
- **Git**: 2.30+
- **Code Editor**: VS Code (recommended) with extensions

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens"
  ]
}
```

## Project Structure

```
rapid-force-cyber-fusion/
├── artifacts/
│   ├── api-server/              # Backend API service
│   │   ├── src/
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── lib/            # Utility libraries
│   │   │   └── app.ts          # Express app configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cyber-fusion/           # Frontend React application
│   │   ├── src/
│   │   │   ├── pages/          # Page components
│   │   │   ├── components/     # Reusable components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utility libraries
│   │   │   └── App.tsx         # Main application component
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── mockup-sandbox/         # Testing sandbox
│
├── lib/
│   └── db/                     # Database layer
│       ├── src/
│       │   └── schema/         # Database schemas
│       └── package.json
│
├── docs/                       # Documentation
├── scripts/                    # Utility scripts
├── .agents/                    # AI agent configurations
├── attached_assets/            # Static assets
├── package.json                # Root package.json
├── tsconfig.json               # TypeScript configuration
├── pnpm-workspace.yaml         # pnpm workspace configuration
└── .env.example                # Environment variables template
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/rapid-force-cyber-fusion.git
cd rapid-force-cyber-fusion
```

### 2. Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - DATABASE_URL
# - JWT_SECRET
# - OPENAI_API_KEY (for AI features)
```

### 4. Set Up Database

```bash
# Using Docker (recommended)
docker-compose up -d postgres

# Or use local PostgreSQL
# Create database
createdb rapid_force

# Push schema
pnpm db:push

# Seed database (optional)
pnpm db:seed
```

### 5. Start Development Servers

```bash
# Start all services
pnpm dev

# Or start individually:
# Terminal 1: API Server
cd artifacts/api-server
pnpm dev

# Terminal 2: Frontend
cd artifacts/cyber-fusion
pnpm dev
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:3000
- **Admin Portal**: http://localhost:5173/admin
- **API Documentation**: http://localhost:3000/api-docs

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Emergency production fixes

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

**Examples:**
```bash
git commit -m "feat(detection): add sigma rule validation"
git commit -m "fix(auth): resolve JWT token expiration issue"
git commit -m "docs(api): update authentication endpoints"
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes and commit
3. Push to remote repository
4. Create Pull Request to `develop`
5. Request code review
6. Address review comments
7. Merge after approval

## Coding Standards

### TypeScript

- Use strict mode (`"strict": true` in tsconfig.json)
- Explicit return types for functions
- Use interfaces for object shapes
- Avoid `any` type
- Use `const` and `let` instead of `var`

```typescript
// Good
interface User {
  id: number;
  name: string;
  email: string;
}

function getUserById(id: number): User {
  // Implementation
}

// Bad
function getUserById(id: any): any {
  // Implementation
}
```

### React

- Functional components with hooks
- Props interfaces for component props
- Custom hooks for reusable logic
- Memoization for performance optimization

```typescript
// Good
interface Props {
  title: string;
  onAction: () => void;
}

const Button: React.FC<Props> = ({ title, onAction }) => {
  return <button onClick={onAction}>{title}</button>;
};

// Bad
const Button = (props: any) => {
  return <button onClick={props.onAction}>{props.title}</button>;
};
```

### API Routes

- RESTful naming conventions
- Consistent error handling
- Input validation with Zod
- Proper HTTP status codes

```typescript
// Good
router.get('/users/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

// Bad
router.get('/getUser', async (req, res) => {
  // Implementation
});
```

### Database Schemas

- Use Drizzle ORM for schema definition
- Proper foreign key relationships
- Indexes for frequently queried fields
- Timestamps for audit trails

```typescript
// Good
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Bad
export const usersTable = pgTable("users", {
  id: serial("id"),
  email: text("email"),
});
```

## Testing

### Unit Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Integration Testing

```bash
# Run integration tests
pnpm test:integration

# With database container
docker-compose up -d postgres
pnpm test:integration
```

### E2E Testing

```bash
# Run E2E tests
pnpm test:e2e

# With all services
docker-compose up -d
pnpm test:e2e
```

### Testing Best Practices

- Write tests for new features
- Mock external dependencies
- Test edge cases and error conditions
- Maintain test coverage >80%
- Use descriptive test names

```typescript
// Good
describe('UserService', () => {
  it('should return user by id', async () => {
    const user = await getUserById(1);
    expect(user).toBeDefined();
    expect(user.id).toBe(1);
  });

  it('should throw error for non-existent user', async () => {
    await expect(getUserById(999)).rejects.toThrow('User not found');
  });
});
```

## Database Operations

### Schema Changes

```bash
# Create new migration
pnpm db:generate

# Apply migration
pnpm db:push

# Open Drizzle Studio (GUI)
pnpm db:studio
```

### Seeding Data

```bash
# Seed database with sample data
pnpm db:seed

# Reset database (caution: deletes all data)
pnpm db:reset
```

### Query Examples

```typescript
// Using Drizzle ORM
import { db } from './lib/db';
import { usersTable } from './lib/db/schema';

// Insert
await db.insert(usersTable).values({
  email: 'user@example.com',
  name: 'John Doe',
});

// Select
const users = await db.select().from(usersTable);

// Update
await db.update(usersTable)
  .set({ name: 'Jane Doe' })
  .where(eq(usersTable.id, 1));

// Delete
await db.delete(usersTable).where(eq(usersTable.id, 1));
```

## API Development

### Adding New Routes

1. Create route file in `artifacts/api-server/src/routes/`
2. Define endpoints with proper HTTP methods
3. Add input validation with Zod schemas
4. Implement error handling
5. Add to router in `artifacts/api-server/src/routes/index.ts`

```typescript
// artifacts/api-server/src/routes/example.ts
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

router.post('/items', async (req, res) => {
  try {
    const data = createItemSchema.parse(req.body);
    // Implementation
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ error: 'Invalid input' });
  }
});

export default router;
```

### Authentication Middleware

```typescript
// artifacts/api-server/src/middleware/requireAuth.ts
import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // Verify token
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

## Frontend Development

### Adding New Pages

1. Create page component in `artifacts/cyber-fusion/src/pages/`
2. Add route in `artifacts/cyber-fusion/src/App.tsx`
3. Create navigation link in sidebar
4. Add to admin portal if needed

```typescript
// artifacts/cyber-fusion/src/pages/NewPage.tsx
import React from 'react';

const NewPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">New Page</h1>
      {/* Page content */}
    </div>
  );
};

export default NewPage;
```

### API Integration

```typescript
// artifacts/cyber-fusion/src/lib/api.ts
const API_BASE = process.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  async get(endpoint: string) {
    const response = await fetch(`${API_BASE}${endpoint}`);
    return response.json();
  },
  
  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

// Usage
const users = await api.get('/users');
```

### State Management

```typescript
// Using React Context
import React, { createContext, useContext, useState } from 'react';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
```

## Debugging

### Backend Debugging

```bash
# Start with debug mode
cd artifacts/api-server
pnpm dev:debug

# Use VS Code debugger
# Set breakpoints in code
# Press F5 to start debugging
```

### Frontend Debugging

```bash
# Start with debug mode
cd artifacts/cyber-fusion
pnpm dev:debug

# Use browser DevTools
# React DevTools extension
# Redux DevTools (if using Redux)
```

### Database Debugging

```bash
# Open Drizzle Studio
pnpm db:studio

# Connect with psql
psql postgresql://user:password@localhost:5432/rapid_force

# View logs
docker-compose logs postgres
```

## Performance Optimization

### Backend Optimization

- Use connection pooling for database
- Implement caching with Redis
- Optimize database queries with indexes
- Use async/await for I/O operations
- Implement rate limiting

### Frontend Optimization

- Code splitting with React.lazy()
- Memoization with React.memo()
- Virtual scrolling for large lists
- Image optimization
- Bundle size analysis

```typescript
// Code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// Memoization
const ExpensiveComponent = React.memo(({ data }) => {
  // Component implementation
});
```

## Security Best Practices

### Input Validation

```typescript
// Always validate input
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const data = schema.parse(req.body);
```

### SQL Injection Prevention

```typescript
// Use parameterized queries (Drizzle ORM handles this)
await db.select().from(usersTable).where(eq(usersTable.id, userId));
```

### XSS Prevention

```typescript
// React automatically escapes JSX
// For dynamic HTML, use DOMPurify
import DOMPurify from 'dompurify';

const cleanHTML = DOMPurify.sanitize(userInput);
```

### Authentication & Authorization

```typescript
// Always authenticate protected routes
router.get('/protected', requireAuth, requireAdmin, (req, res) => {
  // Implementation
});
```

## Common Issues & Solutions

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Dependency Issues

```bash
# Clear cache and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

## Contributing Guidelines

### Before Contributing

1. Read the [Architecture Documentation](architecture.md)
2. Understand the [Code of Conduct](../CODE_OF_CONDUCT.md)
3. Check existing issues and PRs
4. Discuss major changes in an issue first

### Making Changes

1. Create feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation
5. Submit pull request

### Code Review Process

- All changes require code review
- Address review comments promptly
- Keep PRs focused and small
- Update documentation as needed

## Resources

### Documentation

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

### Tools

- [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com/)

### Community

- [GitHub Issues](https://github.com/your-org/rapid-force-cyber-fusion/issues)
- [Discussions](https://github.com/your-org/rapid-force-cyber-fusion/discussions)
- [Discord Server](https://discord.gg/rapidforce)

---

For specific implementation details, see the corresponding service documentation.
