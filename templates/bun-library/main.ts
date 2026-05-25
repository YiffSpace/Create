import { setup } from "@util";

import type { BaseOptions } from "@types";

declare const options: BaseOptions & {
    bunVersion: string;
    publish: boolean;
};

await setup(import.meta.dir, options);
