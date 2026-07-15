import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

import { applyStandardOptions, generate, prepareOutputDir } from "../util/generate.js";
import { getTemplateOptions, getTemplates, resolveTemplatesDir } from "../util/templates.js";
import { toCamelCase } from "../util/util.js";

import type { TemplateConfig } from "../../types.js";

export async function runInteractive(): Promise<void> {
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

    let collected: Collected | undefined, templates: Array<string> = [], longestTemplate = 0;
    const templateConfigs = new Map<string, TemplateConfig | string>();
    const templatesDir = await resolveTemplatesDir(false);
    if (templatesDir === null) {
        console.log("Templates not downloaded\n");
        process.exit(1);
    } else {
        templates = await getTemplates(templatesDir);
        if (templates.length === 0) {
            console.log("No templates available\n");
            process.exit(1);
        } else {
            for (const name of templates) {
                if (name.length > longestTemplate) longestTemplate = name.length;
            }

            for (const name of templates) {
                const options = await getTemplateOptions(join(templatesDir, name));
                templateConfigs.set(name, options);
            }
        }
    }

    try {
        console.log("Select a template:\n");
        templates.forEach((t, i) => {
            const options = templateConfigs.get(t)!;
            console.log(`  ${String(i + 1).padStart(2)}. ${t.padEnd(longestTemplate)} ${typeof options === "string" ? options : options.description}`);
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

        const config = templateConfigs.get(templateSlug)!;
        if (typeof config === "string") {
            console.log(`Invalid template "${templateSlug}" selected: ${config}`);
            process.exit(1);
        }
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
    await generate(templatesDir, templateSlug, config, outDirectory, useCwd, parsedOptions);
}
