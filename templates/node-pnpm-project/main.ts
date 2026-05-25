import { setup } from "@util";

import type { BaseOptions } from "@types";

declare const options: BaseOptions & {
    nodeVersion: string;
    pnpmVersion: string;
};

await setup(import.meta.dir, options);
