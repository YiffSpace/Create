import type { BaseOptions } from "@types";

declare const setup: (dir: string, options: BaseOptions) => Promise<void>;
declare const options: BaseOptions & {
    nodeVersion: string;
    pnpmVersion: string;
};

await setup(import.meta.dir, options);
