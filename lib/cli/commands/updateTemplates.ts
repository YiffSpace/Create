import { exists, rm } from "fs/promises";

import { CACHE_TEMPLATES_DIR, LOCAL_TEMPLATES_DIR, USE_LOCAL_TEMPLATES } from "../util/constants.ts";
import { downloadTemplates } from "../util/templates.ts";

export async function updateTemplates(): Promise<void> {
    if (USE_LOCAL_TEMPLATES && await exists(LOCAL_TEMPLATES_DIR)) {
        console.log("Note: a local templates directory is present and takes precedence over the cache.");
    }
    if (await exists(CACHE_TEMPLATES_DIR)) {
        process.stdout.write("Removing cached templates... ");
        await rm(CACHE_TEMPLATES_DIR, { recursive: true, force: true });
        console.log("done");
    }
    await downloadTemplates();
}
