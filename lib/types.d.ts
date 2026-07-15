export interface BaseOptions {
    description: string;
    git: boolean;
    gitBranch: string;
    name: string;
    outDirectory: string;
    packageName: string;
    tests: boolean;
}

export interface TemplateConfigOption {
    default?: string | boolean | number;
    name: string;
    required: boolean;
    type: "string" | "boolean" | "number";
}

export interface TemplateConfig {
    args: Array<TemplateConfigOption>;
    description: string;
    scripts: Array<string>;
}
