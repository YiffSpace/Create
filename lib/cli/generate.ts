import { join } from "node:path";

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

    if (positionals.length > 2 || values.help) {
        await printTemplateHelp(template, config);
        process.exit(1);
    }

    if (positionals.length === 1) {
        console.error("Missing required argument: <project-name>");
        process.exit(1);
    }

    let dir = positionals[1]!, projectName = positionals[1]!;

    if (positionals[1] === ".") {
        if (!("name" in values) || values.name === undefined) {
            console.error("--name is required when using . as the project directory");
            process.exit(1);
        }
        dir = ".";
        projectName = String(values.name);
    }

    const extraArgs = structuredClone(values);
    delete extraArgs.help;
    delete extraArgs.version;
    delete extraArgs["update-templates"];
    delete extraArgs.interactive;
    const options = await parseExtraOptions(template, extraArgs as Record<string, string>);
    if (typeof options === "string") {
        console.error(options);
        process.exit(1);
    }
    await runGenerate(template, dir, projectName, options);
}
