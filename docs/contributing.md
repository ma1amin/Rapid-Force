# Contributing Guidelines

## Overview

Thank you for your interest in contributing to Rapid Force Cyber Fusion! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We ask that all contributors:

- Be respectful and inclusive
- Focus on constructive feedback
- Welcome newcomers and help them learn
- Be considerate in their language and actions

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Harassment or discriminatory language
- Personal attacks or insults
- Public or private harassment
- Publishing others' private information
- Unprofessional conduct

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Read the [Development Guide](development.md)
- Set up your local development environment
- Familiarized yourself with the project structure
- Reviewed existing issues and pull requests

### First-Time Setup

1. **Fork the repository**
```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/your-username/rapid-force-cyber-fusion.git
cd rapid-force-cyber-fusion
```

2. **Add upstream remote**
```bash
git remote add upstream https://github.com/original-org/rapid-force-cyber-fusion.git
```

3. **Install dependencies**
```bash
pnpm install
```

4. **Set up development environment**
```bash
cp .env.example .env
# Configure .env with your settings
pnpm db:push
pnpm dev
```

## Contribution Workflow

### 1. Find an Issue

Look for issues labeled:
- `good first issue` - Good for first-time contributors
- `help wanted` - Issues that need community help
- `enhancement` - Feature requests
- `bug` - Bug reports

### 2. Create a Branch

```bash
# Ensure you're on the latest develop branch
git checkout develop
git pull upstream develop

# Create a feature branch
git checkout -b feature/your-feature-name
```

**Branch Naming Convention:**
- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Emergency fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes

### 3. Make Changes

#### Coding Standards

Follow the established coding standards:

**TypeScript:**
- Use strict mode
- Explicit return types
- Avoid `any` type
- Use interfaces for object shapes

**React:**
- Functional components with hooks
- Props interfaces
- Custom hooks for reusable logic
- Memoization for performance

**API Routes:**
- RESTful naming
- Consistent error handling
- Input validation with Zod
- Proper HTTP status codes

#### Testing

Write tests for your changes:

```typescript
// Example test
describe('Feature', () => {
  it('should work correctly', () => {
    const result = featureFunction();
    expect(result).toBe(expected);
  });
});
```

Run tests before committing:
```bash
pnpm test
pnpm typecheck
```

#### Documentation

Update documentation as needed:
- API documentation for new endpoints
- Component documentation for new UI components
- Update README for major features
- Add comments for complex logic

### 4. Commit Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>[optional scope]: <description>

git commit -m "feat(authentication): add OAuth2 support"
git commit -m "fix(database): resolve connection timeout issue"
git commit -m "docs(api): update authentication endpoints"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

### 5. Push Changes

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

1. Go to the repository on GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill in the PR template:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if applicable)
5. Request review from maintainers

## Pull Request Guidelines

### PR Title

Use a clear, descriptive title following the commit convention:
```
feat(authentication): add OAuth2 support
```

### PR Description

Include:
- **Summary**: Brief description of changes
- **Motivation**: Why this change is needed
- **Changes**: Detailed list of changes
- **Testing**: How you tested the changes
- **Screenshots**: For UI changes
- **Related Issues**: Link to related issues

### PR Checklist

Before submitting, ensure:

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No merge conflicts with develop branch
- [ ] Commit messages follow convention
- [ ] Self-review completed

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: Maintainers review your code
3. **Feedback**: Address review comments
4. **Approval**: Get approval from maintainers
5. **Merge**: Maintainers merge your PR

## Types of Contributions

### Bug Reports

When reporting bugs, include:

1. **Title**: Clear description of the bug
2. **Description**: Detailed explanation
3. **Steps to Reproduce**: Exact steps to reproduce
4. **Expected Behavior**: What should happen
5. **Actual Behavior**: What actually happens
6. **Environment**: OS, Node.js version, etc.
7. **Screenshots**: If applicable
8. **Logs**: Relevant error logs

**Template:**
```markdown
**Title**: [Bug] Brief description

**Description**: 
Detailed description of the bug

**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Behavior**: 
What should happen

**Actual Behavior**: 
What actually happens

**Environment**:
- OS: [e.g. Ubuntu 20.04]
- Node.js: [e.g. 18.0.0]
- Browser: [e.g. Chrome 100]

**Additional Context**:
Any other relevant information
```

### Feature Requests

When requesting features, include:

1. **Title**: Clear feature description
2. **Motivation**: Why this feature is needed
3. **Proposed Solution**: How you envision it working
4. **Alternatives**: Other approaches considered
5. **Additional Context**: Additional information

**Template:**
```markdown
**Title**: [Feature] Feature description

**Motivation**: 
Why is this feature needed?

**Proposed Solution**: 
How should this feature work?

**Alternatives**: 
What other approaches have you considered?

**Additional Context**: 
Any other relevant information
```

### Documentation Improvements

Documentation contributions are valuable:

- Fix typos and grammar
- Improve clarity and structure
- Add examples and tutorials
- Translate documentation
- Update outdated information

### Code Contributions

#### Small Changes

- Bug fixes
- Feature additions
- Performance improvements
- Code refactoring

#### Large Changes

For major features or architectural changes:

1. Open an issue to discuss first
2. Get feedback from maintainers
3. Create a proposal document
4. Implement after approval

## Development Guidelines

### Security Considerations

- Never commit secrets or sensitive data
- Use environment variables for configuration
- Follow security best practices
- Report security vulnerabilities privately

### Performance Considerations

- Consider performance implications
- Add appropriate caching
- Optimize database queries
- Use lazy loading where appropriate

### Accessibility

- Follow WCAG guidelines
- Ensure keyboard navigation
- Provide alt text for images
- Use semantic HTML

### Internationalization

- Use i18n for user-facing text
- Consider RTL languages
- Test with different locales
- Format dates and numbers appropriately

## Testing Guidelines

### Unit Tests

Write unit tests for:
- Business logic
- Utility functions
- Component logic
- API endpoints

```typescript
describe('userService', () => {
  it('should create user', async () => {
    const user = await createUser({
      email: 'test@example.com',
      name: 'Test User'
    });
    expect(user.email).toBe('test@example.com');
  });
});
```

### Integration Tests

Write integration tests for:
- API endpoints
- Database operations
- External integrations

```typescript
describe('POST /api/users', () => {
  it('should create user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com', name: 'Test User' });
    expect(response.status).toBe(201);
  });
});
```

### E2E Tests

Write E2E tests for:
- Critical user flows
- Multi-step processes
- Cross-service interactions

```typescript
describe('User Registration Flow', () => {
  it('should complete registration', async () => {
    await page.goto('/register');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('#submit');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

## Code Review Guidelines

### For Reviewers

- Be constructive and respectful
- Focus on code quality and best practices
- Explain the reasoning behind suggestions
- Approve when changes are satisfactory

### For Contributors

- Respond to review comments promptly
- Ask for clarification if needed
- Make requested changes
- Push updates to the same branch

## Release Process

### Versioning

Follow [Semantic Versioning](https://semver.org/):
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes (backwards compatible)

### Changelog

Maintain CHANGELOG.md:
```markdown
## [1.1.0] - 2024-01-01

### Added
- New feature X
- New feature Y

### Changed
- Updated feature Z

### Fixed
- Fixed bug A
- Fixed bug B
```

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

## Getting Help

If you need help contributing:

- **Documentation**: Check existing documentation
- **Issues**: Search or create an issue
- **Discussions**: Start a discussion
- **Discord**: Join community server
- **Email**: contact@rapidforce.ai

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Rapid Force Cyber Fusion!
