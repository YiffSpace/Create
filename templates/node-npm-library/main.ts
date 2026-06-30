import { setup } from "@util";

import type { BaseOptions } from "@types";

const options = (globalThis as { options: BaseOptions & { nodeVersion: string; npmVersion: string; publish: boolean } }).options;

await setup(import.meta.dir, options);
