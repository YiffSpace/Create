import { util, type Types } from "create-yiffspace";

const options = (globalThis as unknown as { options: Types.BaseOptions & { bunVersion: string; publish: boolean } }).options;

await util.setup(import.meta.dir, options);
