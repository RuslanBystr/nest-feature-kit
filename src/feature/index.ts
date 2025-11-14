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
    schematic,
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import * as ts from 'typescript';
import { InsertChange } from '@schematics/angular/utility/change';
import { addImportToModule, insertImport } from '@schematics/angular/utility/ast-utils';

interface Schema {
    name: string;
    path?: string;
    cqrs?: boolean;
    flat?: boolean;
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
    if (file) return `${srcDir.path}/${file}`;
    return null;
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
    return (tree: Tree, context: SchematicContext) => {
        const targetPath = options.path || 'src';
        const appModulePath = findAppModulePath(tree, targetPath);
        if (!appModulePath) return tree;

        const moduleClassName = `${strings.classify(options.name)}Module`;
        const moduleFilePath = `${targetPath}/${strings.dasherize(options.name)}/${strings.dasherize(options.name)}.module`;
        const moduleRelativePath = relativePath(appModulePath, `${moduleFilePath}.ts`);
        const appModuleContent = tree.read(appModulePath);
        if (!appModuleContent) return tree;

        const sourceText = appModuleContent.toString('utf-8');
        const sourceFile = ts.createSourceFile(appModulePath, sourceText, ts.ScriptTarget.Latest, true);

        const importChange = insertImport(sourceFile, appModulePath, moduleClassName, moduleRelativePath);
        const importToModuleChange = addImportToModule(sourceFile, appModulePath, moduleClassName, moduleRelativePath);
        const recorder = tree.beginUpdate(appModulePath);

        if (importChange instanceof InsertChange) recorder.insertLeft(importChange.pos, importChange.toAdd);
        let applied = false;
        const changes = Array.isArray(importToModuleChange) ? importToModuleChange : [importToModuleChange];
        for (const c of changes) if (c instanceof InsertChange) { recorder.insertLeft(c.pos, c.toAdd); applied = true; }
        tree.commitUpdate(recorder);

        if (!applied || !isModuleInImports(sourceFile, moduleClassName)) {
            const updatedContent = tree.read(appModulePath)!.toString('utf-8');
            const updatedSource = ts.createSourceFile(appModulePath, updatedContent, ts.ScriptTarget.Latest, true);
            const changes = addToNgModuleImportsChange(updatedSource, appModulePath, moduleClassName);
            if (changes.length) {
                const rec = tree.beginUpdate(appModulePath);
                for (const c of changes) if (c instanceof InsertChange) rec.insertLeft(c.pos, c.toAdd);
                tree.commitUpdate(rec);
            }
        }

        return tree;
    };
}

function isModuleInImports(sourceFile: ts.SourceFile, moduleClassName: string): boolean {
    let found = false;
    const visit = (node: ts.Node) => {
        if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
            const expr = node.expression;
            const identifier = expr.expression;
            if (ts.isIdentifier(identifier) && identifier.text === 'NgModule') {
                const arg = expr.arguments[0];
                if (arg && ts.isObjectLiteralExpression(arg)) {
                    const importsProp = arg.properties.find(
                        p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'imports'
                    ) as ts.PropertyAssignment | undefined;
                    if (importsProp && ts.isArrayLiteralExpression(importsProp.initializer)) {
                        for (const el of importsProp.initializer.elements) {
                            if (el.getText().includes(moduleClassName)) { found = true; return; }
                        }
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return found;
}

function addToNgModuleImportsChange(sourceFile: ts.SourceFile, appModulePath: string, moduleClassName: string): InsertChange[] {
    const changes: InsertChange[] = [];
    let foundDecoratorObject: ts.ObjectLiteralExpression | null = null;

    const findDecorator = (node: ts.Node) => {
        if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
            const expr = node.expression;
            const identifier = expr.expression;
            if (ts.isIdentifier(identifier) && identifier.text === 'NgModule') {
                const arg = expr.arguments[0];
                if (arg && ts.isObjectLiteralExpression(arg)) { foundDecoratorObject = arg; return; }
            }
        }
        ts.forEachChild(node, findDecorator);
    };
    findDecorator(sourceFile);
    if (!foundDecoratorObject) return changes;

    const obj = foundDecoratorObject as ts.ObjectLiteralExpression;
    const importsProp = obj.properties.find(
        (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'imports'
    );

    if (importsProp && ts.isArrayLiteralExpression(importsProp.initializer)) {
        const arr = importsProp.initializer;
        const insertPos = arr.getEnd() - 1;
        const toAdd = arr.elements.length === 0 ? moduleClassName : `, ${moduleClassName}`;
        changes.push(new InsertChange(appModulePath, insertPos, toAdd));
        return changes;
    } else {
        const insertPos = obj.getEnd() - 1;
        const hasProps = obj.properties.length > 0;
        const toAdd = hasProps ? `, imports: [${moduleClassName}]` : `imports: [${moduleClassName}]`;
        changes.push(new InsertChange(appModulePath, insertPos, toAdd));
        return changes;
    }
}

function buildTemplateRule(options: Schema): Rule {
    const targetPath = options.path || 'src';
    return mergeWith(
        apply(url('./files'), [
            applyTemplates({
                name: options.name,
                dasherize: strings.dasherize,
                classify: strings.classify,
                camelize: strings.camelize,
            }),
            move(`${targetPath}/${strings.dasherize(options.name)}`),
        ])
    );
}

export function feature(options: Schema): Rule {
    return (tree: Tree, _context: SchematicContext) => {
        const rules: Rule[] = [];
        rules.push(buildTemplateRule(options));
        rules.push(addModuleImportToAppModuleRule(options));
        if (options.cqrs) rules.push(schematic('feature-single', options));
        return chain(rules)(tree, _context);
    };
}
