import { setup } from "@util";

import type { BaseOptions } from "@types";

const options = (globalThis as { options: BaseOptions & { bunVersion: string; publish: boolean } }).options;

await setup(import.meta.dir, options);
