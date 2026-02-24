# n8n-cli

A command-line interface for managing [n8n](https://n8n.io/) workflows as code. Import, export, lint, format, test, and deploy workflow definitions from your terminal.

## Features

- **Apply** - Deploy local workflow definitions (JSON/YAML) to an n8n server with dry-run support and conflict detection
- **Import** - Pull workflows from an n8n server to local files, with optional YAML conversion and code externalization
- **Lint** - Validate workflow definitions against configurable rules
- **Format** - Auto-organize node positions for cleaner workflow layouts
- **Test** - Execute CLI tests against workflows via webhook endpoints
- **Workflow management** - List, get, create, update, delete, activate, and deactivate workflows via the n8n API
- **Execution management** - List executions, get execution details, and view error information for debugging
- **Git integration** - Apply only workflows changed in a Git diff
- **YAML support** - Work with YAML workflow definitions and external code/SQL files
- **CLAUDE.md integration** - Read project settings (default project ID, auto tags, YAML mode) from CLAUDE.md

## Installation

### Prerequisites

- [Bun](https://bun.sh/) v1.0 or later

### Build from source

```bash
git clone https://github.com/ubie-oss/n8n-cli.git
cd n8n-cli
bun install
make build
```

This produces a standalone `n8n-cli` binary in the project root.

### Cross-compile

Build binaries for multiple platforms:

```bash
make cross-compile
```

Outputs are placed in `dist/`:
- `n8n-cli-darwin-arm64` (macOS Apple Silicon)
- `n8n-cli-darwin-x64` (macOS Intel)
- `n8n-cli-linux-x64` (Linux x64)
- `n8n-cli-windows-x64` (Windows x64)

## Quick Start

1. Set environment variables for your n8n instance:

```bash
export N8N_API_URL="https://your-n8n-instance.example.com"
export N8N_API_KEY="your-api-key"
```

2. List workflows:

```bash
./n8n-cli workflow list
```

3. Import a workflow to a local file:

```bash
./n8n-cli import --ids=<workflow-id> --yaml -d ./definitions
```

4. Edit the local file and apply changes:

```bash
./n8n-cli apply --ids=<workflow-id> --dry-run -d ./definitions
./n8n-cli apply --ids=<workflow-id> -d ./definitions
```

## Commands

### `apply`

Deploy local workflow definitions to the n8n server.

```bash
n8n-cli apply [options]
```

| Option | Description |
|--------|-------------|
| `-d, --dir <path>` | Path to definitions directory (default: `./definitions`) |
| `-p, --project <id>` | Target project ID for workflow transfer |
| `--ids <ids>` | Comma-separated workflow IDs to process |
| `--from-git-changes <spec>` | Apply only files changed in Git diff (e.g., `origin/main..HEAD`) |
| `--dry-run` | Preview changes without applying |
| `--force` | Override conflict detection and duplicate warnings |
| `--no-auto-tag` | Disable automatic tagging |
| `--yaml` / `--no-yaml` | Enable/disable YAML file processing |
| `--warn-duplicates` | Warn when creating workflows with names that already exist remotely |

### `import`

Import workflows from n8n to local files.

```bash
n8n-cli import [options]
```

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes without writing files |
| `-d, --dir <directory>` | Target directory for workflow files (default: `./definitions`) |
| `--ids <ids>` | Comma-separated workflow IDs to import (empty = all) |
| `--include-archived` | Include archived workflows |
| `--yaml` / `--no-yaml` | Output as YAML format with external files / Force JSON |
| `-t, --threshold <n>` | Minimum lines for code externalization |
| `--cleanup-orphans` | Delete local files without matching remote workflow |
| `--cleanup-subfiles` | Delete orphan external files |
| `--tags <tags>` | Filter by tags (comma-separated, AND condition) |

### `lint`

Lint workflow definition files.

```bash
n8n-cli lint [options]
```

| Option | Description |
|--------|-------------|
| `-d, --dir <directory>` | Directory to scan for workflow files |
| `-f, --file <files...>` | Specific files to lint |
| `-c, --config <path>` | Path to `.n8nlintrc.json` config file |
| `--disable-rule <rules...>` | Disable specific rules |
| `--list-rules` | List all available rules and exit |
| `-o, --output <format>` | Output format: `text`, `json` (default: `text`) |

### `fmt`

Format workflow files by reorganizing node positions.

```bash
n8n-cli fmt [options] [files...]
```

| Option | Description |
|--------|-------------|
| `--dry-run` | Show changes without saving |
| `-d, --directory <dir>` | Directory to scan for workflow files |

### `test`

Run CLI test against a workflow via its test webhook.

```bash
n8n-cli test <workflow-id> [options]
```

| Option | Description |
|--------|-------------|
| `-d, --data <json>` | JSON data to send to the webhook |
| `--timeout <ms>` | HTTP request timeout in milliseconds (default: 30000) |
| `--wait-execution` | Wait for execution to complete and show results |
| `--execution-timeout <ms>` | Max time to wait for execution (default: 300000) |
| `--activate` | Automatically activate the workflow if inactive |
| `--dry-run` | Show webhook URL without executing |
| `--show-inputs` | Display workflow input parameters without executing |

### `workflow`

Manage n8n workflows.

```bash
n8n-cli workflow <subcommand>
```

| Subcommand | Description |
|------------|-------------|
| `list` | List all workflows |
| `get <id>` | Get a workflow by ID |
| `create` | Create a new workflow |
| `update <id>` | Update an existing workflow |
| `delete <id>` | Delete a workflow |
| `activate <id>` | Activate a workflow |
| `deactivate <id>` | Deactivate a workflow |

### `execution`

Manage n8n workflow executions.

```bash
n8n-cli execution <subcommand>
```

| Subcommand | Description |
|------------|-------------|
| `list` | List workflow executions |
| `get <id>` | Get execution details by ID |

#### `execution list`

```bash
n8n-cli execution list [options]
```

| Option | Description |
|--------|-------------|
| `-w, --workflow <id>` | Filter by workflow ID |
| `-s, --status <status>` | Filter by status (`success`, `error`, `running`, `waiting`) |
| `-l, --limit <n>` | Maximum number of executions to return (default: 20) |

#### `execution get`

```bash
n8n-cli execution get <id> [options]
```

| Option | Description |
|--------|-------------|
| `--show-data` | Include node execution summary in output |

**Output includes:**
- Execution ID, workflow ID, status, mode
- Start and stop timestamps
- Error details (node, message, description) if the execution failed
- Node execution summary (with `--show-data`)

### `version`

Show version information.

```bash
n8n-cli version
```

### Global Options

| Option | Description |
|--------|-------------|
| `--api-url <url>` | n8n API URL (env: `N8N_API_URL`) |
| `--api-key <key>` | n8n API key (env: `N8N_API_KEY`) |
| `--timeout <duration>` | Request timeout, e.g. `30s`, `5m` (env: `N8N_API_TIMEOUT`) |
| `-o, --output <format>` | Output format: `json`, `table` (default: `json`) |

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `N8N_API_URL` | n8n instance API URL (required) |
| `N8N_API_KEY` | n8n API key (required) |
| `N8N_API_TIMEOUT` | Request timeout in milliseconds |
| `N8N_DEFAULT_PROJECT` | Default project ID for apply |
| `APPLY_FILTER_BY_TAGS` | Comma-separated tags to filter apply targets |

### CLAUDE.md Integration

n8n-cli can read project settings from a `CLAUDE.md` file in your repository:

- **Default project ID** - Automatically set the target project for apply
- **Auto tags** - Tags to automatically add to deployed workflows
- **YAML mode** - Enable/disable YAML processing by default
- **Externalize threshold** - Minimum lines for code externalization during import

## Documentation

See the `docs/` directory for additional documentation.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, build instructions, and contribution guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
