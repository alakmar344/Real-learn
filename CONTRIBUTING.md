# Contributing to RealLearn

Thank you for your interest in contributing to RealLearn! This document provides guidelines and steps for contributing.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue on GitHub with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Your browser and OS information

### Suggesting Features

Feature suggestions are welcome. Please open an issue with:

- A clear description of the feature
- The problem it solves
- Any alternatives you've considered

### Submitting Code

1. **Fork** the repository
2. **Create** a feature branch from `main`
3. **Make** your changes
4. **Run** linting and build checks:
   ```bash
   # Frontend
   cd frontend
   npm run lint
   npm run build

   # Backend
   cd backend
   node --check src/*.js
   ```
5. **Commit** with a clear message (use conventional format: `feat:`, `fix:`, `chore:`, `docs:`)
6. **Push** to your fork
7. **Open** a Pull Request with a description of your changes

## Development Setup

### Frontend
```bash
cd frontend
cp .env.local.example .env.local  # Fill in Clerk keys
npm install
npm run dev
```

### Backend
```bash
cd backend
cp .env.example .env  # Fill in Cloudflare, Clerk, MongoDB, Serper keys
npm install
npm start
```

See the [Local Development](README.md#local-development) section in the README for full details.

## Code Style

- Follow existing code conventions in the codebase
- Use TypeScript for frontend code
- Use ES Modules for backend code
- Keep components focused and small
- Write meaningful commit messages

## Pull Request Guidelines

- Keep PRs focused on a single change
- Update documentation if needed
- Ensure the build passes before submitting
- Be respectful in code reviews

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## Questions?

If you have questions about contributing, please open an issue or contact us at esamzai365@gmail.com.
