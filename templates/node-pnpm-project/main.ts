import { setup } from "@util";

import type { BaseOptions } from "@types";

const options = (globalThis as { options: BaseOptions & { nodeVersion: string; pnpmVersion: string } }).options;

await setup(import.meta.dir, options);
