# Slate — Getting Started

## Prerequisites

- [Bun](https://bun.sh) installed
- Node.js 18+

## Installation

Clone or create a new Slate store in your project:

```bash
# If starting from scratch, create the directory structure
mkdir -p slate/prds slate/tasks
```

## Using the Library

Import Slate in your project:

```typescript
import { Slate } from "slate";

const slate = new Slate({ dir: "./slate" });

// Create a PRD
const prd = await slate.prds.create({
  title: "Implement authentication",
  status: "todo",
});

// Create a task under that PRD
const task = await slate.tasks.create({
  title: "Design auth flow",
  priority: "high",
  prd: prd.id,
  dependencies: [],
});

// Query actionable tasks
const actionable = await slate.tasks.query({
  filter: (task) => !task.isBlocked(slate),
});
```

## Using the CLI

### PRD commands

```bash
# Create a PRD
slate prd create --title "My Feature"

# List all PRDs
slate prd list

# Show a PRD
slate prd show <prd-id>
```

### Task commands

```bash
# Create a task (body via stdin)
echo "Implement the CLI parser with arg parsing." | slate task create --title "Implement CLI parser" --prd <prd-id> --priority high

# Pipe from a file
cat notes.md | slate task create --title "Implement CLI parser" --prd <prd-id> --priority high

# Body is optional — a task with just a title is valid
slate task create --title "Quick note" --priority low

# List all tasks
slate task list

# Filter tasks by status
slate task list --status todo

# Update a task
slate task update <task-id> --status in-progress

# Delete a task
slate task delete <task-id>
```

### Body via stdin

The task body (freeform content) is passed via stdin, not as a CLI flag. This avoids shell escaping issues when the body contains quotes, newlines, JSON, or other special characters — common when agents generate content.

```bash
# Pipe from another command
echo "description" | slate task create --title "Task" --priority high

# Pipe from a file
cat notes.md | slate task create --title "Task" --priority high

# Heredoc
slate task create --title "Task" --priority high <<EOF
Line one
Line two
{ "json": true }
EOF

# No body (optional)
slate task create --title "Task" --priority high
```

The body becomes the Markdown body of the task file (below the YAML frontmatter).

## Store Structure

Slate stores data in a `slate/` directory at the project root:

```
project/
  slate/
    prds/
      prd-001.md    # Each PRD is a separate file
    tasks/
      task-001.md   # Each task is a separate file
```

Each file uses Markdown with YAML frontmatter:

```markdown
---
id: task-001
title: Implement CLI parser
status: todo
priority: high
dependencies: []
prd: prd-001
created: 2026-05-12
updated: 2026-05-12
---

Implementation notes go here.
```

## Running Tests

```bash
bun run test
```

## Type Checking

```bash
bun run typecheck
```

## Formatting

```bash
bun run format
```
