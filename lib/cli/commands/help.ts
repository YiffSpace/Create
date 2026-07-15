import { join } from "node:path";

import { getTemplateOptions, getTemplates, resolveTemplatesDir } from "../util/templates.js";

import type { TemplateConfig } from "../../types.js";

export async function printHelp(): Promise<void> {
    console.log("Usage: create-yiffspace <template> [options]\n");
    const dir = await resolveTemplatesDir(false);
    if (dir === null) {
        console.log("Templates not downloaded\n");
    } else {
        const templates = await getTemplates(dir);
        if (templates.length === 0) {
            console.log("No templates available\n");
        } else {
            let longest = 0;
            for (const name of templates) {
                if (name.length > longest) longest = name.length;
            }

            console.log("Available Templates:\n");
            for (const name of templates) {
                const options = await getTemplateOptions(join(dir, name));
                console.log(`  ${name.padEnd(longest)} ${typeof options === "string" ? options : options.description}`);
            }
        }
    }
    console.log("\nGlobal flags:\n");
    console.log("  -i, --interactive            launch interactive mode");
    console.log("  -u, --update-templates       re-download templates from the repository");
    console.log("  -v, --version                get the installed version");
    console.log("  -h, --help                   display this message");
}

export async function printTemplateHelp(slug: string, config: TemplateConfig): Promise<void> {
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
