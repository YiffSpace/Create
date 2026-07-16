import { readdir } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BRANCH, CACHE_TEMPLATES_DIR, LOCAL_TEMPLATES_DIR, REPO, USE_LOCAL_TEMPLATES } from "./constants.ts";
import { exists } from "./util.ts";

import type { TemplateConfig } from "../../types.ts";

export async function isValidTemplate(dir: string): Promise<boolean> {
    if (!await exists(dir)) return false;
    const optionsExists = await exists(join(dir, "options.json"));
    const mainExists = await exists(join(dir, "main.ts"));
    return optionsExists && mainExists;
}

export async function getTemplates(dir: string): Promise<Array<string>> {
    const templates: Array<string> = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const valid = await isValidTemplate(join(dir, entry.name));
        if (valid) templates.push(entry.name);
    }
    return templates;
}

let localNotice = false;
export async function resolveTemplatesDir(download: false): Promise<string | null>;
export async function resolveTemplatesDir(download?: true): Promise<string>;
export async function resolveTemplatesDir(download = true): Promise<string | null> {
    if (USE_LOCAL_TEMPLATES && await exists(LOCAL_TEMPLATES_DIR)) {
        if (!localNotice) {
            console.log("Note: a local templates directory is present and takes precedence over the cache.");
            localNotice = true;
        }
        return LOCAL_TEMPLATES_DIR;
    }
    if (await exists(CACHE_TEMPLATES_DIR)) {
        return CACHE_TEMPLATES_DIR;
    }
    if (!download) return null;
    return downloadTemplates();
}

export async function downloadTemplates(): Promise<string> {
    process.stdout.write("Fetching templates from repository... ");
    const url = `https://github.com/${REPO}/archive/refs/heads/${BRANCH}.tar.gz`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch templates (${response.status} ${response.statusText})`);
    }
    const tarPath = join(tmpdir(), "create-yiffspace.tar.gz");
    await Bun.write(tarPath, await response.arrayBuffer());

    await mkdir(CACHE_TEMPLATES_DIR, { recursive: true });
    const proc = Bun.spawn(
        [
            "tar",
            "-xzf",
            tarPath,
            "-C",
            CACHE_TEMPLATES_DIR,
            "--strip-components=1",
        ],
        { stderr: "inherit" },
    );
    const code = await proc.exited;
    await rm(tarPath, { force: true });
    if (code !== 0) {
        throw new Error("Failed to extract templates archive");
    }

    for (const entry of await readdir(CACHE_TEMPLATES_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) await rm(join(CACHE_TEMPLATES_DIR, entry.name));
        else {
            const valid = await isValidTemplate(join(CACHE_TEMPLATES_DIR, entry.name));
            if (!valid) await rm(join(CACHE_TEMPLATES_DIR, entry.name), { recursive: true, force: true });
        }
    }

    console.log("done");
    return CACHE_TEMPLATES_DIR;
}

export async function getTemplateOptions(dir: string): Promise<TemplateConfig | string> {
    if (!await exists(dir)) return `Error: template does not exist`;
    const valid = await isValidTemplate(dir);
    if (!valid) return `Error: invalid template`;
    let options: TemplateConfig | undefined;
    try {
        options = await Bun.file(join(dir, "options.json")).json() as TemplateConfig;
    } catch (e) {
        return `Error: ${(e as Error | undefined)?.message ?? String(e)}`;
    }
    return options;
}
