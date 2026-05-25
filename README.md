# create-yiffspace

A project generator for [YiffSpace](https://github.com/YiffSpace) projects. Run it with Bun to scaffold a new project from a template.

## Usage

```sh
bunx create-yiffspace <template> <project-name> [options]
```

If you have already cloned this repository, you can run it directly:

```sh
bun lib/cli.ts <template> <project-name> [options]
```

To scaffold into the current directory instead of creating a new one, pass `.` as the name and provide `--name` separately:

```sh
bunx create-yiffspace <template> . --name <project-name> [options]
```

## Templates

| Template | Description |
|---|---|
| [`bun-library`](#bun-library) | Publishable Bun library with TypeScript, ESLint, build scripts, and type declarations |
| [`bun-project`](#bun-project) | Private Bun project with TypeScript and ESLint |
| [`node-npm-library`](#node-npm-library) | Publishable Node library managed with npm |
| [`node-npm-project`](#node-npm-project) | Node project managed with npm |
| [`node-pnpm-library`](#node-pnpm-library) | Publishable Node library managed with pnpm |
| [`node-pnpm-project`](#node-pnpm-project) | Private Node project managed with pnpm |

### Common options

All templates accept these options:

| Option | Type | Description |
|---|---|---|
| `--description` | string | Package description |
| `--repository-url` | string | Git repository URL |
| `--homepage-url` | string | Package homepage URL |
| `--bugs-url` | string | Bug tracker URL |
| `--[no-]tests` | boolean | Include test directory and test workflow (default: `true`) |

### `bun-library`

```sh
bunx create-yiffspace bun-library <project-name> [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--bun-version` | string | `1.3.0` | Bun version to pin in `packageManager` and `.bun-version` |
| `--[no-]publish` | boolean | `true` | Include npm publish workflow; removes `private: true` |

### `bun-project`

```sh
bunx create-yiffspace bun-project <project-name> [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--bun-version` | string | `1.3.0` | Bun version to pin in `packageManager` and `.bun-version` |

### `node-npm-library`

```sh
bunx create-yiffspace node-npm-library <project-name> [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--node-version` | string | `24.16.0` | Node version to pin in `.node-version` and workflows |
| `--npm-version` | string | `11.15.0` | npm version to pin in `packageManager` |
| `--[no-]publish` | boolean | `true` | Include npm publish workflow; removes `private: true` |

### `node-npm-project`

```sh
bunx create-yiffspace node-npm-project <project-name> [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--node-version` | string | `24.16.0` | Node version to pin in `.node-version` and workflows |
| `--npm-version` | string | `11.15.0` | npm version to pin in `packageManager` |
| `--[no-]publish` | boolean | `true` | Include npm publish workflow; removes `private: true` |

### `node-pnpm-library`

```sh
bunx create-yiffspace node-pnpm-library <project-name> [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--node-version` | string | `24.16.0` | Node version to pin in `.node-version` and workflows |
| `--pnpm-version` | string | `11.3.0` | pnpm version to pin in `packageManager` |
| `--[no-]publish` | boolean | `true` | Include npm publish workflow; removes `private: true` |

### `node-pnpm-project`

```sh
bunx create-yiffspace node-pnpm-project <project-name> [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--node-version` | string | `24.16.0` | Node version to pin in `.node-version` and workflows |
| `--pnpm-version` | string | `11.3.0` | pnpm version to pin in `packageManager` |

## Global Flags

| Flag | Description |
|---|---|
| `--name <string>` | Project display name when using `.` as the directory (required with `.`) |
| `--package-name <string>` | npm package name; defaults to the project name with spaces replaced by dashes |
| `--update-templates` | Re-download templates from the repository into the local cache |
| `--help`, `-h` | Show help |

## How Templates Are Resolved

The CLI looks for templates in this order:

1. `templates/` adjacent to the script (present when the repo is cloned locally)
2. `~/.cache/create-yiffspace/templates/` (populated on first run when the above is absent)
3. Downloads from GitHub and populates the cache

To refresh a stale cache:

```sh
bunx create-yiffspace --update-templates
```

## Adding a Template

Each template lives in `templates/<slug>/` and consists of three parts:

### `options.json`

Describes the template and its options. The `scripts` array lists shell scripts (from `templates/<slug>/scripts/`) to run in the generated directory after files are copied.

```json
{
  "description": "Human-readable description shown in help",
  "args": [
    { "name": "flag-name",  "type": "boolean", "required": false, "default": true },
    { "name": "some-value", "type": "string",  "required": true,  "default": "value" }
  ],
  "scripts": ["install.sh"]
}
```

Supported `type` values: `string`, `boolean`, `number`.

Arg names are kebab-case in `options.json` and converted to camelCase in the `options` object (`bun-version` → `bunVersion`, `repository-url` → `repositoryUrl`).

### `main.ts`

A Bun script run after options are parsed, responsible for copying files from `files/` into `outDirectory` and rendering any `.eta` template files. A single `options` object is injected as a global at runtime:

```ts
declare const options: {
    // always present
    name: string;         // project display name
    packageName: string;  // npm package name
    outDirectory: string; // absolute path to the output directory
    template: string;     // template slug

    // template-specific args (camelCase)
    bunVersion: string;
    tests: boolean;
    // ...
};
```

See any existing `main.ts` for a reference implementation.

### `files/`

Static files copied into `outDirectory`. Files with a `.eta` extension are rendered as [Eta](https://eta.js.org) templates with `it` bound to the `options` object, and written without the `.eta` suffix.

**Example** — `files/package.json.eta`:
```
{
  "name": "<%= it.packageName %>",
  "packageManager": "bun@<%= it.bunVersion %>"
}
```

### `scripts/`

Shell scripts listed in `options.json` that execute in `outDirectory` after `main.ts` completes. If a script exits non-zero, the output directory is deleted (unless `.` mode was used) and the error is reported.

## License

MIT
