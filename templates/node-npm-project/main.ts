import { setup } from "@util";

import type { BaseOptions } from "@types";

declare const options: BaseOptions & {
    nodeVersion: string;
    npmVersion: string;
};

await setup(import.meta.dir, options);
