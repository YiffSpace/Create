import { homedir } from "node:os";
import { join } from "node:path";

import { exists } from "./util.ts";

export const LOCAL_TEMPLATES_DIR = join(import.meta.dir, "../../templates");
export const USE_LOCAL_TEMPLATES = await exists(LOCAL_TEMPLATES_DIR);
export const CACHE_TEMPLATES_DIR = join(homedir(), ".cache", "create-yiffspace");
export const REPO = "YiffSpace/Create";
export const BRANCH = "templates";
