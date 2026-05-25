import type { BaseOptions } from "@types";

declare const setup: (dir: string, options: BaseOptions) => Promise<void>;
declare const options: BaseOptions & {
    bunVersion: string;
};

await setup(import.meta.dir, options);
