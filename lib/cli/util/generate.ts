import { exists, mkdir, rename, rm } from "fs/promises";
import { join } from "path";

import type { TemplateConfig } from "../../types.ts";

export async function prepareOutputDir(outDirectory: string, useCwd: boolean): Promise<void> {
    if (useCwd) return;
    if (await exists(outDirectory)) {
        console.error(`Directory already exists: ${outDirectory}`);
        process.exit(1);
    }
    await mkdir(outDirectory, { recursive: true });
}

export function applyStandardOptions(
    options: Record<string, unknown>, templateSlug: string, name: string, outDirectory: string, packageName: string,
): void {
    options.template = templateSlug;
    options.name = name;
    options.outDirectory = outDirectory;
    options.packageName = packageName;
    options.year = new Date().getFullYear();
    if (typeof options.repositoryUrl === "string") {
        options.homepageUrl ??= `${options.repositoryUrl}#readme`;
        options.bugsUrl ??= `${options.repositoryUrl}/issues`;
    }
}

export async function generate(
    templatesDir: string, templateSlug: string, config: TemplateConfig, outDirectory: string, useCwd: boolean, options: Record<string, unknown>,
): Promise<void> {
    console.log(`Creating ${templateSlug} project "${options.name as string}"...`);

    (globalThis as Record<string, unknown>).options = options;

    const scriptsDir = join(templatesDir, templateSlug, "scripts");

    // Version managers (nodenv, asdf) auto-switch the active Node the moment anything execs
    // `node` under this directory once a `.node-version` file exists. That pin describes what
    // the finished project should run on, not what's needed to run its own install step (e.g.
    // a newer package manager may require a newer Node than the project targets). Hide it while
    // the scripts run so they execute under whatever toolchain is already active.
    const nodeVersionFile = join(outDirectory, ".node-version");
    const hiddenNodeVersionFile = join(outDirectory, ".node-version.generate-tmp");
    let hidNodeVersionFile = false;

    try {
        await import(join(templatesDir, templateSlug, "main.ts"));

        if (await exists(nodeVersionFile)) {
            await rename(nodeVersionFile, hiddenNodeVersionFile);
            hidNodeVersionFile = true;
        }

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
    } finally {
        if (hidNodeVersionFile && await exists(hiddenNodeVersionFile)) {
            await rename(hiddenNodeVersionFile, nodeVersionFile);
        }
    }

    console.log(`\nProject created at ${outDirectory}`);
}
