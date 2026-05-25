import { mkdir } from "node:fs/promises";
import { copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { Eta } from "eta";

import type { BaseOptions } from "@types";

export const eta = new Eta();

export async function getFiles(dir: string, options: BaseOptions & { publish?: boolean }): Promise<Array<string>> {
    const allFiles = await Array.fromAsync(new Bun.Glob("**").scan({ cwd: dir, dot: true }));
    const exclude = [new Bun.Glob("node_modules/**")];

    if (!options.tests) {
        exclude.push(new Bun.Glob("test/**"), new Bun.Glob(".github/workflows/test.yml"));
    }
    if (options.publish === false) {
        exclude.push(new Bun.Glob(".github/workflows/publish.yml"));
    }

    return exclude.length > 0
        ? allFiles.filter(file => !exclude.some(ex => ex.match(file)))
        : allFiles;
}

export async function copyFiles(dir: string, options: BaseOptions): Promise<void> {
    const filesDir = join(dir, "files");
    const files = await getFiles(filesDir, options);

    for (const file of files) {
        const dest = join(options.outDirectory, file);
        await mkdir(dirname(dest), { recursive: true });
        if (file.endsWith(".eta")) {
            const realDest = Bun.file(join(options.outDirectory, file).slice(0, -4));
            const content = await eta.renderStringAsync(await Bun.file(join(filesDir, file)).text(), options);
            await realDest.write(content);
        } else {
            await copyFile(join(filesDir, file), dest);
        }
    }
}

export async function setupGit(options: BaseOptions): Promise<void> {
    if (options.git) {
        const script = `git init -b ${options.gitBranch}`;
        console.log(`\n$ ${script}`);
        const proc = Bun.spawn(script.split(" "), {
            cwd: options.outDirectory,
            stderr: "inherit",
            stdin: "inherit",
            stdout: "inherit",
        });
        const code = await proc.exited;
        if (code !== 0) {
            throw new Error(`Script "${script}" failed with exit code ${code}`);
        }
    }
}

export async function setup(dir: string, options: BaseOptions): Promise<void> {
    await copyFiles(dir, options);
    await setupGit(options);
}
