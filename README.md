# @bystr/nest-feature-kit

[![Buy me a coffee](https://img.shields.io/badge/Ko--fi-Support-orange?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/ruslanbystr)

Personal NestJS feature generator library. Quickly scaffold feature modules setup and automatic `AppModule` integration.

## Features

* Generate feature modules with controllers, services, DTOs, and docs (swagger).
* Automatically adds the generated module to your `AppModule` imports.
* Customizable path and module names.
* Reusable across projects.

## Installation

```bash
npm install -D @bystr/nest-feature-kit
```

## Usage
### Change nest-cli.json collection
```bash
"collection": "@bystr/nest-feature-kit",
```

```bash
nest g feature <name> [options]
```

### Options

* `--path <path>` — Base path for the module (default: `src`).
* `--flat` — Generate without nested folders.

### Example

```bash
nest g feature user
```

Generates:

```
src/user/
├── user.module.ts
├── controllers/user.controller.ts
├── services/user.service.ts
├── dto/index.ts
└── docs/index.ts
```

`UserModule` is automatically imported in your `AppModule`.

## License

MIT
