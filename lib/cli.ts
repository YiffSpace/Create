#!/usr/bin/env bun
import { access } from "node:fs/promises";
import { mkdir, readdir, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

import { setup } from "./util.ts";

interface OptionDef {
    default?: string | boolean | number;
    name: string;
    required: boolean;
    type: "string" | "boolean" | "number";
}

interface TemplateConfig {
    args: Array<OptionDef>;
    description: string;
    scripts: Array<string>;
}

async function exists(path: string): Promise<boolean> {
    return access(path).then(() => true, () => false);
}

async function prepareOutputDir(outDirectory: string, useCwd: boolean): Promise<void> {
    if (useCwd) return;
    if (await exists(outDirectory)) {
        console.error(`Directory already exists: ${outDirectory}`);
        process.exit(1);
    }
    await mkdir(outDirectory, { recursive: true });
}

function applyStandardOptions(
    options: Record<string, unknown>,
    templateSlug: string,
    name: string,
    outDirectory: string,
    packageName: string,
): void {
    options.template = templateSlug;
    options.name = name;
    options.outDirectory = outDirectory;
    options.packageName = packageName;
    options.year = new Date().getFullYear();
}

const LOCAL_TEMPLATES_DIR = join(import.meta.dir, "../templates");
const CACHE_BASE_DIR = join(homedir(), ".cache", "create-yiffspace");
const CACHE_TEMPLATES_DIR = join(CACHE_BASE_DIR, "templates");
const REPO = "YiffSpace/Create";
const BRANCH = "master";

async function downloadTemplates(): Promise<string> {
    process.stdout.write("Fetching templates from repository... ");
    const url = `https://github.com/${REPO}/archive/refs/heads/${BRANCH}.tar.gz`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch templates (${response.status} ${response.statusText})`);
    }
    const tarPath = join(tmpdir(), "create-yiffspace.tar.gz");
    await Bun.write(tarPath, await response.arrayBuffer());

    await mkdir(CACHE_BASE_DIR, { recursive: true });
    const repoName = REPO.split("/")[1]!;
    const proc = Bun.spawn(
        ["tar", "-xzf", tarPath, "-C", CACHE_BASE_DIR, "--strip-components=1", `${repoName}-${BRANCH}/templates`],
        { stderr: "inherit" },
    );
    const code = await proc.exited;
    await rm(tarPath, { force: true });
    if (code !== 0) {
        throw new Error("Failed to extract templates archive");
    }

    console.log("done");
    return CACHE_TEMPLATES_DIR;
}

async function updateTemplates(): Promise<void> {
    if (await exists(LOCAL_TEMPLATES_DIR)) {
        console.log("Note: a local templates directory is present and takes precedence over the cache.");
    }
    if (await exists(CACHE_TEMPLATES_DIR)) {
        process.stdout.write("Removing cached templates... ");
        await rm(CACHE_TEMPLATES_DIR, { recursive: true, force: true });
        console.log("done");
    }
    await downloadTemplates();
}

async function resolveTemplatesDir(): Promise<string> {
    if (await exists(LOCAL_TEMPLATES_DIR)) {
        return LOCAL_TEMPLATES_DIR;
    }
    if (await exists(CACHE_TEMPLATES_DIR)) {
        return CACHE_TEMPLATES_DIR;
    }
    return downloadTemplates();
}

async function getTemplates(dir: string): Promise<Array<string>> {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
}

function toCamelCase(name: string): string {
    return name.replace(/-[a-z]/g, r => r.slice(1).toUpperCase());
}

function parseOptions(defs: Array<OptionDef>, argv: Array<string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const def of defs) {
        if (def.default !== undefined) {
            result[toCamelCase(def.name)] = def.default;
        }
    }

    let i = 0;
    while (i < argv.length) {
        const arg = argv[i]!;
        if (!arg.startsWith("--")) {
            console.error(`Unexpected positional argument: ${arg}`);
            process.exit(1);
        }
        const isNo = arg.startsWith("--no-");
        const name = isNo ? arg.slice(5) : arg.slice(2);
        const def = defs.find(d => d.name === name);
        if (!def) {
            console.error(`Unknown option: ${arg}`);
            process.exit(1);
        }
        const key = toCamelCase(name);
        if (def.type === "boolean") {
            result[key] = !isNo;
            i++;
        } else {
            const val = argv[i + 1];
            if (val === undefined || val.startsWith("-")) {
                console.error(`Option --${name} requires a value`);
                process.exit(1);
            }
            result[key] = def.type === "number" ? Number(val) : val;
            i += 2;
        }
    }

    for (const def of defs) {
        if (def.required && result[toCamelCase(def.name)] === undefined) {
            console.error(`Missing required option: --${def.name}`);
            process.exit(1);
        }
    }

    return result;
}

function printHelp(templates: Array<string>, configs: Map<string, TemplateConfig>): void {
    console.log("Usage: create-yiffspace <template> [options]\n");
    console.log("Available templates:\n");
    for (const t of templates) {
        const config = configs.get(t)!;
        console.log(`  ${t.padEnd(24)} ${config.description}`);
    }
    console.log("\nGlobal flags:\n");
    console.log("  -i, --interactive            launch interactive mode");
    console.log("  --update-templates           re-download templates from the repository");
}

function extractFlag(argv: Array<string>, flag: string): { rest: Array<string>; value: string | undefined } {
    const idx = argv.indexOf(`--${flag}`);
    if (idx === -1 || idx + 1 >= argv.length || argv[idx + 1]!.startsWith("--")) {
        return { value: undefined, rest: argv };
    }
    return {
        rest: [...argv.slice(0, idx), ...argv.slice(idx + 2)],
        value: argv[idx + 1],
    };
}

function printTemplateHelp(slug: string, config: TemplateConfig): void {
    console.log(`Usage: create-yiffspace ${slug} <project-name | .> [options]\n`);
    console.log(`  ${config.description}\n`);
    console.log("Options:");
    console.log("  --name <string>              project name when using . as the directory (required with .)");
    for (const arg of config.args) {
        const defStr = arg.default !== undefined ? ` [default: ${String(arg.default)}]` : "";
        const reqStr = arg.required ? " (required)" : "";
        if (arg.type === "boolean") {
            console.log(`  --[no-]${arg.name}${defStr}${reqStr}`);
        } else {
            console.log(`  --${arg.name} <${arg.type}>${defStr}${reqStr}`);
        }
    }
}

async function generate(
    TEMPLATES_DIR: string,
    templateSlug: string,
    config: TemplateConfig,
    outDirectory: string,
    useCwd: boolean,
    options: Record<string, unknown>,
): Promise<void> {
    console.log(`Creating ${templateSlug} project "${options.name as string}"...`);

    const g = globalThis as Record<string, unknown>;
    g.options = options;
    g.setup = setup;

    const scriptsDir = join(TEMPLATES_DIR, templateSlug, "scripts");
    try {
        await import(join(TEMPLATES_DIR, templateSlug, "main.ts"));

        for (const script of config.scripts) {
            console.log(`\n$ ${script}`);
            const proc = Bun.spawn(["sh", join(scriptsDir, script)], {
                cwd: outDirectory,
                stderr: "inherit",
                stdin: "inherit",
                stdout: "inherit",
            });
            const code = await proc.exited;
            if (code !== 0) {
                throw new Error(`Script "${script}" failed with exit code ${code}`);
            }
        }
    } catch (err) {
        if (!useCwd) {
            await rm(outDirectory, { recursive: true, force: true });
        }
        throw err;
    }

    console.log(`\nProject created at ${outDirectory}`);
}

async function runInteractive(TEMPLATES_DIR: string, templates: Array<string>, configs: Map<string, TemplateConfig>): Promise<void> {
    if (!process.stdin.isTTY) {
        console.error("Interactive mode requires a TTY. Provide arguments directly instead.");
        process.exit(1);
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = (question: string): Promise<string> => rl.question(question);

    const confirm = async (label: string, def: boolean): Promise<boolean> => {
        const hint = def ? "Y/n" : "y/N";
        const answer = (await ask(`${label} [${hint}]: `)).trim();
        return answer === "" ? def : answer.toLowerCase().startsWith("y");
    };

    const text = async (label: string, def?: string): Promise<string> => {
        const hint = def !== undefined ? ` [${def}]` : "";
        const answer = (await ask(`${label}${hint}: `)).trim();
        return (answer || def) ?? "";
    };

    interface Collected {
        config: TemplateConfig;
        dirName: string;
        displayName: string;
        packageName: string;
        parsedOptions: Record<string, unknown>;
        templateSlug: string;
        useCwd: boolean;
    }

    let collected: Collected | undefined;
    try {
        console.log("Select a template:\n");
        templates.forEach((t, i) => {
            console.log(`  ${String(i + 1).padStart(2)}. ${t.padEnd(26)} ${configs.get(t)!.description}`);
        });
        console.log();

        let templateSlug!: string;
        while (true) {
            const answer = (await ask(`Template (1-${templates.length}): `)).trim();
            const n = parseInt(answer, 10);
            if (n >= 1 && n <= templates.length) {
                templateSlug = templates[n - 1]!;
                break;
            }
            console.error(`Enter a number between 1 and ${templates.length}.`);
        }

        const config = configs.get(templateSlug)!;
        console.log();

        let dirName!: string;
        while (true) {
            dirName = await text("Project name");
            if (dirName) break;
            console.error("Project name is required.");
        }

        const useCwd = await confirm("Use current directory", false);

        let displayName = dirName;
        if (useCwd) {
            while (true) {
                displayName = await text("Display name", dirName);
                if (displayName) break;
                console.error("Display name is required.");
            }
        }

        const packageName = await text("Package name", displayName.replaceAll(" ", "-"));

        if (config.args.length > 0) console.log("\nOptions:");
        const parsedOptions: Record<string, unknown> = {};
        for (const arg of config.args) {
            const key = toCamelCase(arg.name);
            if (arg.type === "boolean") {
                parsedOptions[key] = await confirm(`  ${arg.name}`, (arg.default as boolean | undefined) ?? false);
            } else {
                const val = await text(`  ${arg.name}`, arg.default !== undefined ? String(arg.default) : undefined);
                parsedOptions[key] = arg.type === "number" ? Number(val) : val;
            }
        }

        collected = { templateSlug, config, dirName, useCwd, displayName, packageName, parsedOptions };
    } finally {
        rl.close();
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!collected) return;
    const { templateSlug, config, dirName, useCwd, displayName, packageName, parsedOptions } = collected;
    const outDirectory = useCwd ? process.cwd() : resolve(process.cwd(), dirName);
    await prepareOutputDir(outDirectory, useCwd);
    applyStandardOptions(parsedOptions, templateSlug, displayName, outDirectory, packageName);
    console.log();
    await generate(TEMPLATES_DIR, templateSlug, config, outDirectory, useCwd, parsedOptions);
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);

    if (argv[0] === "--update-templates") {
        await updateTemplates();
        process.exit(0);
    }

    const TEMPLATES_DIR = await resolveTemplatesDir();
    const templates = await getTemplates(TEMPLATES_DIR);
    const configs = new Map<string, TemplateConfig>();
    for (const t of templates) {
        configs.set(t, await Bun.file(join(TEMPLATES_DIR, t, "options.json")).json() as TemplateConfig);
    }

    if (argv[0] === "--help" || argv[0] === "-h") {
        printHelp(templates, configs);
        process.exit(0);
    }

    if (argv.length === 0 || argv[0] === "--interactive" || argv[0] === "-i") {
        await runInteractive(TEMPLATES_DIR, templates, configs);
        return;
    }

    const templateSlug = argv[0]!;
    if (!templates.includes(templateSlug)) {
        console.error(`Unknown template: "${templateSlug}"\n`);
        printHelp(templates, configs);
        process.exit(1);
    }

    const config = configs.get(templateSlug)!;
    const restArgv = argv.slice(1);

    if (restArgv[0] === "--help" || restArgv[0] === "-h" || restArgv.length === 0) {
        printTemplateHelp(templateSlug, config);
        process.exit(restArgv.length === 0 ? 1 : 0);
    }

    const dirArg = restArgv[0]!;
    if (dirArg.startsWith("--")) {
        console.error("Missing required argument: <project-name>");
        process.exit(1);
    }

    const useCwd = dirArg === ".";
    const { value: nameFlag, rest: optsArgv1 } = extractFlag(restArgv.slice(1), "name");
    const { value: packageNameFlag, rest: optsArgv } = extractFlag(optsArgv1, "package-name");

    if (useCwd && !nameFlag) {
        console.error("--name is required when using . as the project directory");
        process.exit(1);
    }

    const projectName = useCwd ? nameFlag! : dirArg;
    const outDirectory = useCwd ? process.cwd() : resolve(process.cwd(), dirArg);

    const options = parseOptions(config.args, optsArgv);
    await prepareOutputDir(outDirectory, useCwd);
    applyStandardOptions(options, templateSlug, projectName, outDirectory, packageNameFlag ?? projectName.replaceAll(" ", "-"));
    await generate(TEMPLATES_DIR, templateSlug, config, outDirectory, useCwd, options);
}

main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
