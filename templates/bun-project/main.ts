import { setup } from "@util";

import type { BaseOptions } from "@types";

const options = (globalThis as { options: BaseOptions & { bunVersion: string } }).options;

await setup(import.meta.dir, options);
