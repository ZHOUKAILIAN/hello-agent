# Documentation Directory

This directory contains comprehensive documentation for the **hello-agent** project, organized to support a documentation-driven development workflow.

---

## Directory Structure

```
docs/
├── README.md           # This file - documentation overview
├── requirements/       # Feature requirements and specifications
├── design/            # Technical designs and architecture decisions
├── standards/         # Coding standards and project conventions
└── analysis/          # Project analysis and research notes
```

---

## Documentation-First Workflow

**CRITICAL**: Before writing any code, you must:

1. **Document Requirements** (`requirements/`)
   - What needs to be built?
   - Why is it needed?
   - What are the acceptance criteria?

2. **Design the Solution** (`design/`)
   - How will it be implemented?
   - What are the trade-offs?
   - What patterns will be used?

3. **Follow Standards** (`standards/`)
   - What coding conventions apply?
   - What project patterns should be used?
   - Are there security considerations?

4. **Get Approval**
   - Review documentation with team/stakeholders
   - Only implement after approval

See [CLAUDE.md](../CLAUDE.md) for complete workflow details.

---

## Document Types

### Requirements Documents
**Location**: `requirements/`
**Purpose**: Define WHAT needs to be built
**When to Create**: Before any new feature or change

**Template Structure**:
```markdown
# Feature Name

## Overview
Brief description of the feature

## Requirements
### FR-1: Requirement Name
- Priority: High/Medium/Low
- Status: Planned/In Progress/Implemented
- Description: Detailed requirement
- Acceptance Criteria: Measurable success criteria

## Non-Functional Requirements
Performance, security, reliability considerations

## Related Documents
Links to design docs, standards, etc.
```

---

### Design Documents
**Location**: `design/`
**Purpose**: Define HOW things will be built
**When to Create**: Before implementing non-trivial features

**Template Structure**:
```markdown
# Design: Feature Name

## Overview
High-level design approach

## Architecture
Component diagrams, data flow

## Design Decisions
- Decision: What was decided
- Rationale: Why this approach
- Trade-offs: Pros and cons
- Alternatives: What was considered

## Implementation Details
Detailed technical specifications

## Related Documents
Links to requirements, standards, etc.
```

---

### Standards Documents
**Location**: `standards/`
**Purpose**: Define HOW to write code
**When to Update**: When establishing new patterns

**Includes**:
- Coding conventions
- Project-specific patterns
- Security guidelines
- Best practices

---

### Analysis Documents
**Location**: `analysis/`
**Purpose**: Research and exploration
**When to Create**: When investigating problems or solutions

**Includes**:
- Project analysis
- Technology evaluations
- Performance benchmarks
- Security audits

---

## Current Documentation

### Requirements
- [Project Requirements](requirements/project-requirements.md) - Core requirements for hello-agent

### Design
- [Technical Design](design/technical-design.md) - System architecture and component design

### Standards
- [Coding Standards](standards/coding-standards.md) - General coding conventions
- [Project Conventions](standards/project-conventions.md) - Project-specific patterns

### Analysis
- [Project Analysis](analysis/project-analysis.md) - Comprehensive codebase analysis

---

## Documentation Guidelines

### Writing Style
- Be clear and concise
- Use examples liberally
- Include code snippets
- Link related documents

### Maintenance
- Keep docs in sync with code
- Update when requirements change
- Archive obsolete docs (don't delete)
- Use git for version history

### Review Process
1. Write documentation first
2. Review with team/stakeholders
3. Get approval
4. Implement code
5. Update docs if implementation differs

---

## Quick Reference

### Before Adding a Feature
1. Create requirement doc in `requirements/`
2. Create design doc in `design/`
3. Review against `standards/`
4. Get approval
5. Implement

### Before Changing Architecture
1. Document current state in `analysis/`
2. Create new design doc in `design/`
3. Update requirements if needed
4. Review trade-offs
5. Get approval
6. Implement

### Before Establishing New Pattern
1. Document pattern in `standards/`
2. Include examples and rationale
3. Update existing docs if needed
4. Communicate to team

---

## Tools and Templates

### Markdown Tips
```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
`Inline code`

```javascript
// Code block
const example = "code";
```

- Bullet list
1. Numbered list

[Link text](./path/to/doc.md)
```

### Diagram Tools
- ASCII diagrams (simple, in markdown)
- Mermaid (supported by many viewers)
- External tools (draw.io, Lucidchart)

---

## Related Resources

- [CLAUDE.md](../CLAUDE.md) - Main development guide
- [README.md](../README.md) - User-facing documentation
- [package.json](../package.json) - Project configuration

---

## Questions?

If you're unsure about:
- What documentation to create → Check [CLAUDE.md](../CLAUDE.md)
- How to structure a doc → Use templates above
- Where to put a doc → Ask yourself: requirement, design, standard, or analysis?

**Remember**: When in doubt, document more rather than less. Documentation is never wasted effort.
