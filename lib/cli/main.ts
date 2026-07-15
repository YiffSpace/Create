import { parseArgs } from "node:util";

import { runGenerateMain } from "./generate.js";
import { runRootMain } from "./root.js";

const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        "help": {
            type: "boolean",
            short: "h",
        },
        "version": {
            type: "boolean",
            short: "v",
        },
        "interactive": {
            type: "boolean",
            short: "i",
        },
        "update-templates": {
            type: "boolean",
            short: "u",
        },
    },
    strict: false,
    allowNegative: true,
    allowPositionals: true,
});

export type ValuesType = typeof values;
export type PositionalsType = typeof positionals;

if (positionals.length == 0) {
    await runRootMain(values);
} else {
    await runGenerateMain(values, positionals);
}
