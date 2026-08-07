import { access } from "node:fs/promises";
import { join } from "node:path";

import { getTemplateOptions, resolveTemplatesDir } from "./templates.ts";

import type { PathLike } from "node:fs";

export async function exists(path: PathLike): Promise<boolean> {
    return access(path).then(() => true, () => false);
}

export function toCamelCase(name: string): string {
    return name.replace(/-[a-z]/g, r => r.slice(1).toUpperCase());
}

export async function parseExtraOptions(template: string, options: Record<string, string>): Promise<Record<string, unknown> | string> {
    const templatesDir = await resolveTemplatesDir(true);
    const config = await getTemplateOptions(join(templatesDir, template));
    if (typeof config === "string") return config;
    const result: Record<string, unknown> = {};

    for (const def of config.args) {
        if (def.default !== undefined) {
            result[toCamelCase(def.name)] = def.default;
        }
    }

    for (const [name, value] of Object.entries(options)) {
        const isNo = name.startsWith("no-");
        const key = toCamelCase(isNo ? name.slice(3) : name);
        const def = config.args.find(a => toCamelCase(a.name) === key);
        if (!def) {
            console.log(`Unknown option: ${value}`);
            process.exit(1);
        }

        if (def.type === "boolean") {
            result[key] = !isNo;
        } else {
            if (!value || value.startsWith("-")) {
                console.error(`Option --${name} requires a value`);
                process.exit(1);
            }
            result[key] = def.type === "number" ? Number(value) : value;
        }
    }

    for (const def of config.args) {
        if (def.required && result[toCamelCase(def.name)] === undefined) {
            console.error(`Missing required option: ${def.name}`);
            process.exit(1);
        }
    }

    return result;
}
