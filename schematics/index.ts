import {
    Rule,
    SchematicContext,
    Tree,
    apply,
    url,
    applyTemplates,
    move,
    mergeWith,
    chain,
    filter,
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import * as ts from 'typescript';
import { InsertChange } from '@schematics/angular/utility/change';
import { addImportToModule, insertImport } from '@schematics/angular/utility/ast-utils';

interface Schema {
    name: string;
    path?: string;
    flat?: boolean;
    endpoints?: string;
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
}

function normalizeEndpoints(options: Schema) {
    const letters = (options.endpoints || '').toLowerCase().split('');
    return {
        create: !!options.create || letters.includes('c'),
        read: !!options.read || letters.includes('r'),
        update: !!options.update || letters.includes('u'),
        delete: !!options.delete || letters.includes('d'),
    };
}

function findAppModulePath(tree: Tree, basePath: string): string | null {
    const tries = [
        `${basePath}/app.module.ts`,
        `${basePath}/app/app.module.ts`,
        `src/app.module.ts`,
        `src/app/app.module.ts`,
    ];
    for (const p of tries) if (tree.exists(p)) return p;
    const srcDir = tree.getDir(basePath || 'src');
    const file = srcDir.subfiles.find(f => f.endsWith('app.module.ts'));
    return file ? `${srcDir.path}/${file}` : null;
}

function relativePath(from: string, to: string): string {
    const fromDir = from.replace(/\/[^\/]+$/, '');
    const fromParts = fromDir.split('/').filter(Boolean);
    const toParts = to.split('/').filter(Boolean);
    let i = 0;
    while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++;
    const up = fromParts.length - i;
    const relParts = Array(up).fill('..').concat(toParts.slice(i));
    let rel = relParts.join('/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return rel.replace(/\.ts$/, '');
}

function addModuleImportToAppModuleRule(options: Schema): Rule {
    return (tree: Tree) => {
        const targetPath = options.path || 'src';
        const appModulePath = findAppModulePath(tree, targetPath);
        if (!appModulePath || !tree.exists(appModulePath)) return tree;

        const moduleClassName = `${strings.classify(options.name)}Module`;
        const moduleFilePath = options.flat
            ? `${targetPath}/${strings.dasherize(options.name)}.module`
            : `${targetPath}/${strings.dasherize(options.name)}/${strings.dasherize(options.name)}.module`;

        const moduleRelativePath = relativePath(appModulePath, `${moduleFilePath}.ts`);
        const content = tree.read(appModulePath);
        if (!content) return tree;

        const sourceText = content.toString('utf-8');
        const sourceFile = ts.createSourceFile(appModulePath, sourceText, ts.ScriptTarget.Latest, true);

        try {
            const importChange = insertImport(sourceFile, appModulePath, moduleClassName, moduleRelativePath);
            const importToModuleChange = addImportToModule(sourceFile, appModulePath, moduleClassName, moduleRelativePath);

            const recorder = tree.beginUpdate(appModulePath);
            if (importChange instanceof InsertChange) recorder.insertLeft(importChange.pos, importChange.toAdd);

            const changes = Array.isArray(importToModuleChange) ? importToModuleChange : [importToModuleChange];
            for (const c of changes) if (c instanceof InsertChange) recorder.insertLeft(c.pos, c.toAdd);

            tree.commitUpdate(recorder);
        } catch (e) {
            console.warn(`Could not add import for module ${moduleClassName}:`, e);
        }

        return tree;
    };
}

function buildTemplateRule(options: Schema): Rule {
    const targetPath = options.path || 'src';
    const featureDir = options.flat
        ? `${targetPath}`
        : `${targetPath}/${strings.dasherize(options.name)}`;

    const flags = normalizeEndpoints(options);

    return mergeWith(
        apply(url('./templates/feature/__name__'), [
            filter((filePath: string) => {
                const p = filePath.replace(/\\/g, '/');

                if (p.includes('/docs/') && p.includes('api-create-') && !flags.create) return false;
                if (p.includes('/docs/') && p.includes('api-find-all-') && !flags.read) return false;
                if (p.includes('/docs/') && p.includes('api-find-one-') && !flags.read) return false;
                if (p.includes('/docs/') && p.includes('api-update-') && !flags.update) return false;
                if (p.includes('/docs/') && p.includes('api-delete-') && !flags.delete) return false;

                if (p.includes('/dto/') && p.includes('create-') && !flags.create) return false;
                if (p.includes('/dto/') && p.includes('update-') && !flags.update) return false;

                if (p.endsWith('/dto/index.ts.template') && !(flags.create || flags.update)) return false;
                if (p.endsWith('/docs/index.ts.template') && !(flags.create || flags.read || flags.update || flags.delete)) return false;

                return true;
            }),

            applyTemplates({
                name: options.name,
                dasherize: strings.dasherize,
                classify: strings.classify,
                camelize: strings.camelize,
                hasCreate: flags.create,
                hasRead: flags.read,
                hasUpdate: flags.update,
                hasDelete: flags.delete,
            }),

            move(featureDir),
        ])
    );
}

export function feature(options: Schema): Rule {
    return (tree: Tree, _context: SchematicContext) => {
        _context.logger.info(`schematic options: ${JSON.stringify(options)}`);

        let endpoints = options.endpoints || '';

        if (options.name.includes('-')) {
            const [featureName, short] = options.name.split('-');
            options.name = featureName;
            if (!endpoints) endpoints = short;
        }

        const flags = normalizeEndpoints({ ...options, endpoints });

        const rules: Rule[] = [
            buildTemplateRule({ ...options, ...flags }),
            addModuleImportToAppModuleRule(options),
        ];

        return chain(rules)(tree, _context);
    };
}

