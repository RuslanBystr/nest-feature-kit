# @byst/nest-feature-kit

Personal NestJS feature generator library. Quickly scaffold feature modules setup and automatic `AppModule` integration.

## Features

* Generate feature modules with controllers, services, DTOs, and docs (swagger).
* Automatically adds the generated module to your `AppModule` imports.
* Customizable path and module names.
* Reusable across projects.

## Installation

```bash
npm install -D @byst/nest-feature-kit
```

## Usage

```bash
nest g feature <name> [options]
```

### Options

* `--path <path>` — Base path for the module (default: `src`).
* `--flat` — Generate without nested folders.

### Example

```bash
nest g feature user --path src/modules
```

Generates:

```
src/modules/user/
├── user.module.ts
├── controllers/user.controller.ts
├── services/user.service.ts
├── dto/index.ts
└── docs/index.ts
```

`UserModule` is automatically imported in your `AppModule`.

## Contributing

Clone the repo, add your templates or schematics, and publish your personal version.

```
npm run build
npm publish
```

## License

MIT
