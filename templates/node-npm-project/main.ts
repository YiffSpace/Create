import type { BaseOptions } from "@types";

declare const setup: (dir: string, options: BaseOptions) => Promise<void>;
declare const options: BaseOptions & {
    nodeVersion: string;
    npmVersion: string;
};

await setup(import.meta.dir, options);
