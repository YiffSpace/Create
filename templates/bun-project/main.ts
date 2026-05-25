import { setup } from "@util";

import type { BaseOptions } from "@types";

declare const options: BaseOptions & {
    bunVersion: string;
};

await setup(import.meta.dir, options);
