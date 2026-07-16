import { join, resolve } from "node:path";

import { applyStandardOptions, generate, prepareOutputDir } from "../util/generate.ts";
import { getTemplateOptions, resolveTemplatesDir } from "../util/templates.ts";

export async function runGenerate(template: string, dirArg: string, projectName: string, options: Record<string, unknown>): Promise<void> {
    const useCwd = dirArg === ".";
    const outDirectory = useCwd ? process.cwd() : resolve(process.cwd(), dirArg);
    const packageName = options.packageName ? options.packageName as string : projectName.toLowerCase().replaceAll(" ", "-");
    const templatesDir = await resolveTemplatesDir();
    const config = await getTemplateOptions(join(templatesDir, template));
    if (typeof config === "string") {
        console.error(config);
        process.exit(1);
    }
    await prepareOutputDir(outDirectory, useCwd);
    applyStandardOptions(options, template, projectName, outDirectory, packageName);
    await generate(templatesDir, template, config, outDirectory, useCwd, options);
}
