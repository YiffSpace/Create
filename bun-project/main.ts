import { util, type Types } from "create-yiffspace";

const options = (globalThis as unknown as { options: Types.BaseOptions & { bunVersion: string } }).options;

await util.setup(import.meta.dir, options);
