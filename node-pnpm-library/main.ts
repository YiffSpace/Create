import { util, type Types } from "create-yiffspace";

const options = (globalThis as unknown as { options: Types.BaseOptions & { nodeVersion: string; pnpmVersion: string; publish: boolean } }).options;

await util.setup(import.meta.dir, options);
