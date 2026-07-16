import { printHelp } from "./commands/help.ts";
import { runInteractive } from "./commands/interactive.ts";
import { updateTemplates } from "./commands/updateTemplates.ts";
import { printVersion } from "./commands/version.ts";

import type { ValuesType } from "./main.ts";

export async function runRootMain(values: ValuesType): Promise<void> {
    if (values.help) {
        await printHelp();
        process.exit(0);
    }

    if (values.version) {
        printVersion();
        process.exit(0);
    }

    if (values["update-templates"]) {
        await updateTemplates();
        process.exit(0);
    }

    if (values.interactive || Bun.argv.length === 2) {
        await runInteractive();
        process.exit(0);
    }

    if (process.stdin.isTTY) {
        await runInteractive();
        process.exit(0);
    }

    await printHelp();
    process.exit(1);
}
