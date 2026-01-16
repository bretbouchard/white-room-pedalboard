# White Room Documentation Library

**Welcome to the White Room documentation library!** This is your central hub for all project documentation, organized by purpose and audience.

---

## Quick Navigation

### 📖 For New Users
- **[User Guides](user/)** - Tutorials, how-to guides, and feature explanations
- **[App Flow & Page Inventory](architecture/APP_FLOW_AND_PAGE_INVENTORY.md)** - Complete list of all pages and screens

### 🏗️ For Architects & Designers
- **[Architecture Documentation](architecture/)** - System design, technical decisions, and platform capabilities
- **[Platform Capabilities Matrix](architecture/PLATFORM_CAPABILITIES_MATRIX.md)** - Feature comparison across all platforms

### 👨‍💻 For Developers
- **[Developer Guides](developer/)** - Setup, workflows, coding standards, and best practices
- **[Security Documentation](developer/security/)** - Security audits, threat models, and checklists
- **[Deployment Guides](deployment/)** - Build, release, and deployment procedures

### 📦 For Release Managers
- **[Deployment Documentation](deployment/)** - Production readiness, validation, and release procedures

---

## Documentation Structure

```
docs/
├── README.md (this file)
│
├── architecture/          # System design & technical decisions
│   ├── APP_FLOW_AND_PAGE_INVENTORY.md
│   ├── PLATFORM_CAPABILITIES_MATRIX.md
│   ├── FFI_BRIDGE_ARCHITECTURE.md
│   ├── SCHILLINGER_INTEGRATION.md
│   ├── undo-redo-system.md
│   └── ...
│
├── user/                  # User guides & tutorials
│   ├── getting-started/
│   ├── tutorials/
│   ├── feature-guides/
│   └── troubleshooting/
│
├── developer/             # Developer documentation
│   ├── beads-best-practices.md
│   ├── beads-integration.md
│   ├── beads-quick-reference.md
│   ├── error-handling-guide.md
│   ├── DSP_PARAMETER_UI_IMPLEMENTATION_REPORT.md
│   ├── FFI_INTEGRATION_STATUS.md
│   ├── security/          # Security & compliance
│   │   ├── SECURITY_AUDIT_PREPARATION.md
│   │   ├── SECURITY_AUDIT_SUMMARY.md
│   │   ├── SECURITY_CHECKLIST.md
│   │   ├── SECURITY_QUICK_REFERENCE.md
│   │   └── THREAT_MODEL.md
│   └── ...
│
├── deployment/            # Build, release & deployment
│   ├── production-readiness-checklist.md
│   ├── production-readiness-summary.md
│   ├── production-readiness-visual.md
│   ├── production-risk-assessment.md
│   ├── launch-day-quick-reference.md
│   ├── TEST_EXECUTION_REPORT.md
│   ├── TEST_SUITE_DOCUMENTATION.md
│   └── ...
│
├── api/                   # API references & type definitions
│   └── (coming soon)
│
└── archive/               # Historical documentation
    ├── iphone-companion-app-summary.md
    ├── SCHILLINGER_IMPLEMENTATION_SUMMARY.md
    ├── schillinger-books-ii-iii-iv-integration-summary.md
    └── ...
```

---

## Key Documents by Category

### Architecture Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [App Flow & Page Inventory](architecture/APP_FLOW_AND_PAGE_INVENTORY.md) | Complete inventory of all pages, screens, and navigation flows | All |
| [Platform Capabilities Matrix](architecture/PLATFORM_CAPABILITIES_MATRIX.md) | Feature comparison across macOS, tvOS, iOS, iPad, Raspberry Pi | Architects, Developers |
| [FFI Bridge Architecture](architecture/FFI_BRIDGE_ARCHITECTURE.md) | Foreign Function Interface design between Swift and JUCE | Developers |
| [Schillinger Integration](architecture/SCHILLINGER_INTEGRATION.md) | Schillinger theory integration architecture | Architects |
| [Undo/Redo System](architecture/undo-redo-system.md) | State management for undo/redo operations | Developers |
| [Rhythm Integration](architecture/rhythm-integration.md) | Rhythm pattern system architecture | Developers |
| [Performances Feature](architecture/PERFORMANCES_FEATURE.md) | Performance recording and playback system | Developers |
| [iPhone Companion App Architecture](architecture/iphone-companion-app-architecture.md) | iOS companion app design | Architects, Mobile Devs |

### Developer Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [Beads Best Practices](developer/beads-best-practices.md) | Task tracking with Beads (bd) | Developers |
| [Beads Integration](developer/beads-integration.md) | Beads integration with White Room | Developers |
| [Beads Quick Reference](developer/beads-quick-reference.md) | Quick reference for Beads commands | Developers |
| [Error Handling Guide](developer/error-handling-guide.md) - Error handling patterns and strategies | Developers |
| [DSP Parameter UI Implementation](developer/DSP_PARAMETER_UI_IMPLEMENTATION_REPORT.md) | DSP parameter system implementation | Audio Developers |
| [FFI Integration Status](developer/FFI_INTEGRATION_STATUS.md) | FFI bridge integration progress | Developers |

### Security Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [Security Audit Preparation](developer/security/SECURITY_AUDIT_PREPARATION.md) | Security audit preparation checklist | Security Team |
| [Security Audit Summary](developer/security/SECURITY_AUDIT_SUMMARY.md) | Security audit results and findings | Security Team |
| [Security Checklist](developer/security/SECURITY_CHECKLIST.md) | Security best practices checklist | Developers |
| [Security Quick Reference](developer/security/SECURITY_QUICK_REFERENCE.md) | Quick security guidelines | Developers |
| [Threat Model](developer/security/THREAT_MODEL.md) - Threat modeling and risk assessment | Security Team |

### Deployment Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [Production Readiness Checklist](deployment/production-readiness-checklist.md) | Pre-deployment validation checklist | Release Managers |
| [Production Readiness Summary](deployment/production-readiness-summary.md) | Production readiness status | Release Managers |
| [Production Readiness Visual](deployment/production-readiness-visual.md) | Visual production readiness guide | Release Managers |
| [Production Risk Assessment](deployment/production-risk-assessment.md) | Risk assessment for production deployment | Release Managers |
| [Launch Day Quick Reference](deployment/launch-day-quick-reference.md) | Launch day procedures and checklist | Release Managers |
| [Test Execution Report](deployment/TEST_EXECUTION_REPORT.md) | Test execution results and metrics | QA Team |
| [Test Suite Documentation](deployment/TEST_SUITE_DOCUMENTATION.md) | Test suite documentation and guides | QA Team |

### Archive Documents (Historical)

| Document | Purpose | Date |
|----------|---------|------|
| [iPhone Companion App Summary](archive/iphone-companion-app-summary.md) | Historical iPhone companion app summary | Historical |
| [Schillinger Implementation Summary](archive/SCHILLINGER_IMPLEMENTATION_SUMMARY.md) | Schillinger implementation summary | Historical |
| [Schillinger Books II-III-IV Integration Summary](archive/schillinger-books-ii-iii-iv-integration-summary.md) | Schillinger books integration summary | Historical |

---

## How to Use This Documentation

### For New Contributors
1. Start with **[Developer Guides](developer/)** to set up your development environment
2. Review **[Security Documentation](developer/security/)** to understand security requirements
3. Read **[Architecture Documentation](architecture/)** to understand system design

### For Feature Development
1. Check **[Platform Capabilities Matrix](architecture/PLATFORM_CAPABILITIES_MATRIX.md)** for platform support
2. Review **[App Flow & Page Inventory](architecture/APP_FLOW_AND_PAGE_INVENTORY.md)** for existing pages
3. Consult **[Architecture Documentation](architecture/)** for integration patterns

### For Release Managers
1. Use **[Production Readiness Checklist](deployment/production-readiness-checklist.md)** for validation
2. Follow **[Launch Day Quick Reference](deployment/launch-day-quick-reference.md)** for releases
3. Review **[Test Execution Reports](deployment/TEST_EXECUTION_REPORT.md)** for quality metrics

### For Security Audits
1. Start with **[Threat Model](developer/security/THREAT_MODEL.md)**
2. Review **[Security Audit Summary](developer/security/SECURITY_AUDIT_SUMMARY.md)**
3. Use **[Security Checklist](developer/security/SECURITY_CHECKLIST.md)** for validation

---

## Documentation Standards

### Writing Style
- Use clear, concise language
- Provide examples where helpful
- Include diagrams for complex systems
- Keep documents up-to-date

### File Naming
- Use `UPPER_CASE_WITH_UNDERSCORES.md` for main documents
- Use `kebab-case.md` for guides and tutorials
- Include dates in report filenames when appropriate

### Document Organization
- Place documents in the most relevant category
- Use subdirectories for related groups of documents
- Move outdated documents to `archive/`

---

## Contributing to Documentation

### Adding New Documentation
1. Choose the appropriate category (architecture, user, developer, deployment)
2. Create the document in the relevant directory
3. Update this README.md to include the new document
4. Follow the naming conventions

### Updating Existing Documentation
1. Make your changes to the document
2. Update the "Last Updated" date if present
3. Consider archiving outdated content rather than deleting it

### Review Process
- Technical documentation should be reviewed by subject matter experts
- User documentation should be tested by actual users
- Security documentation must be reviewed by the security team

---

## Documentation Maintenance

### Regular Reviews
- **Quarterly**: Review all documents for accuracy
- **Before Releases**: Update deployment and release documentation
- **After Features**: Update architecture and integration docs

### Outdated Documentation
- Move outdated documents to `archive/`
- Add a note explaining why it was archived
- Update references to point to new documents

---

## Platform-Specific Documentation

### macOS Development
- See **[Architecture](architecture/)** for macOS-specific features
- See **[Platform Capabilities Matrix](architecture/PLATFORM_CAPABILITIES_MATRIX.md)** for macOS capabilities

### iOS/iPad Development
- See **[App Flow & Page Inventory](architecture/APP_FLOW_AND_PAGE_INVENTORY.md)** for iOS/iPad pages
- See **[iPhone Companion App Architecture](architecture/iphone-companion-app-architecture.md)** for mobile app design

### tvOS Development
- See **[Platform Capabilities Matrix](architecture/PLATFORM_CAPABILITIES_MATRIX.md)** for tvOS capabilities
- See **[App Flow & Page Inventory](architecture/APP_FLOW_AND_PAGE_INVENTORY.md)** for tvOS pages

### Raspberry Pi Development
- See **[Platform Capabilities Matrix](architecture/PLATFORM_CAPABILITIES_MATRIX.md)** for Raspberry Pi status
- See **[Architecture](architecture/)** for embedded system considerations

---

## Getting Help

### Documentation Questions
- Check the relevant category section above
- Search for keywords in document titles
- Review archived documents for historical context

### Technical Questions
- Consult **[Developer Guides](developer/)**
- Review **[Architecture Documentation](architecture/)**
- Check **[Security Documentation](developer/security/)** for security-related questions

### Process Questions
- See **[Deployment Documentation](deployment/)** for release processes
- Review **[Beads Documentation](developer/beads-quick-reference.md)** for task management

---

## Additional Resources

### Project Structure
- **Source Code**: `/Users/bretbouchard/apps/schill/white_room/`
- **SDK**: `sdk/` - TypeScript definitions
- **JUCE Backend**: `juce_backend/` - C++ audio engine
- **Swift Frontend**: `swift_frontend/` - SwiftUI interfaces
- **Infrastructure**: `infrastructure/` - Build and CI/CD

### Related Documentation
- **Project Constitution**: `/Users/bretbouchard/apps/schill/white_room/CONSTITUTION.md` (moved to `developer/`)
- **Claude AI Instructions**: `/Users/bretbouchard/apps/schill/white_room/.claude/CLAUDE.md`

### External Resources
- **JUCE Documentation**: https://docs.juce.com/
- **SwiftUI Documentation**: https://developer.apple.com/documentation/swiftui/
- **Beads Task Management**: https://github.com/steveyegge/beads

---

**Document Status**: ✅ Complete
**Last Updated**: January 16, 2026
**Maintained By**: White Room Development Team

---

*This documentation library is a living resource. If you find errors or omissions, please update the relevant documents or notify the team.*
