import { join } from "node:path";
import { parseArgs } from "node:util";

import { runGenerate } from "./commands/generate.ts";
import { printTemplateHelp } from "./commands/help.ts";
import { getTemplateOptions, getTemplates, resolveTemplatesDir } from "./util/templates.ts";
import { parseExtraOptions } from "./util/util.ts";

import type { PositionalsType, ValuesType } from "./main";

export async function runGenerateMain(values: ValuesType, positionals: PositionalsType): Promise<void> {
    const template = positionals[0]!;
    if (positionals.length === 0) {
        console.error("Missing required argument: <template>");
        process.exit(1);
    }

    const templatesDir = await resolveTemplatesDir();
    const templates = await getTemplates(templatesDir);
    if (!templates.includes(template)) {
        console.error(`Invalid template: ${template}`);
        process.exit(1);
    }

    const config = await getTemplateOptions(join(templatesDir, template));
    if (typeof config === "string") {
        console.error(`Failed to load template config: ${config}`);
        process.exit(1);
    }

    // The initial parse in main.ts only knows about the global flags, so template-specific
    // options (whose names depend on the template chosen above) get misread as booleans and
    // their values get misread as extra positionals. Re-parse the raw argv now that the
    // template's option schema is known.
    const optionsSchema: Record<string, { type: "string" | "boolean" }> = {
        "help": { type: "boolean" },
        "version": { type: "boolean" },
        "interactive": { type: "boolean" },
        "update-templates": { type: "boolean" },
        "name": { type: "string" },
    };
    for (const def of config.args) {
        optionsSchema[def.name] = { type: def.type === "boolean" ? "boolean" : "string" };
    }

    let parsed: { positionals: Array<string>; values: Record<string, string | boolean | undefined> };
    try {
        parsed = parseArgs({
            args: Bun.argv.slice(2),
            options: optionsSchema,
            strict: true,
            allowNegative: true,
            allowPositionals: true,
        });
    } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
    }

    if (parsed.positionals.length > 2 || parsed.values.help) {
        await printTemplateHelp(template, config);
        process.exit(1);
    }

    if (parsed.positionals.length === 1) {
        console.error("Missing required argument: <project-name>");
        process.exit(1);
    }

    let dir = parsed.positionals[1]!, projectName = parsed.positionals[1]!;

    if (parsed.positionals[1] === ".") {
        if (!("name" in parsed.values) || parsed.values.name === undefined) {
            console.error("--name is required when using . as the project directory");
            process.exit(1);
        }
        dir = ".";
        projectName = String(parsed.values.name);
    }

    const extraArgs = structuredClone(parsed.values);
    delete extraArgs.help;
    delete extraArgs.version;
    delete extraArgs["update-templates"];
    delete extraArgs.interactive;
    delete extraArgs.name;
    const options = await parseExtraOptions(template, extraArgs as Record<string, string>);
    if (typeof options === "string") {
        console.error(options);
        process.exit(1);
    }
    await runGenerate(template, dir, projectName, options);
}
