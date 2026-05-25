import { setup } from "@util";

import type { BaseOptions } from "@types";

declare const options: BaseOptions & {
    nodeVersion: string;
    npmVersion: string;
    publish: boolean;
};

await setup(import.meta.dir, options);
