# @bystr/nest-feature-kit

[![Buy me a coffee](https://img.shields.io/badge/Ko--fi-Support-orange?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/ruslanbystr)

Personal NestJS feature generator library. Quickly scaffold feature modules with optional CRUD endpoints and automatic AppModule integration.

## Features

- Generate feature modules with controllers, services, DTOs, and docs (Swagger decorators).
- Automatically adds the generated module to your AppModule imports.
- Generate features with full CRUD, or only specific endpoints (create, read, update, delete).
- Customizable path and module names.
- Reusable across projects.

## Installation

npm install -D @bystr/nest-feature-kit

## Usage

### Change `nest-cli.json` collection
```json
{
  "collection": "@bystr/nest-feature-kit"
}
```


### Generate features `nest g -h`

Command           | Generated Endpoints           | Description
------------------|------------------------------|---------------------------------------
nest g empty <name> | none                         | Base feature module without endpoints
nest g crud <name>    | create, read, update, delete | Full CRUD feature module
nest g create <name>  | create                        | Feature module with only Create
nest g read <name>    | read                          | Feature module with only Read
nest g update <name>  | update                        | Feature module with only Update
nest g delete <name>  | delete                        | Feature module with only Delete

### Options

- --path <path> — Base path for the module (default: src).
- --flat — Generate files directly in the target path without nested folders.

### Example
```bash
nest g crud user
```

### Generated user CRUD:
```
src/user/
├── controllers
│   └── user.controller.ts
├── docs
│   ├── api-create-user.decorator.ts
│   ├── api-read-user.decorator.ts
│   ├── api-update-user.decorator.ts
│   ├── api-delete-user.decorator.ts
│   └── index.ts
├── dto
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── index.ts
├── services
│   └── user.service.ts
└── user.module.ts
```

UserModule is automatically imported in your AppModule.

## License

MIT
