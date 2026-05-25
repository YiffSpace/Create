import type { BaseOptions } from "@types";

declare const setup: (dir: string, options: BaseOptions & { publish?: boolean }) => Promise<void>;

declare const options: BaseOptions & {
    bunVersion: string;
    publish: boolean;
};

await setup(import.meta.dir, options);
