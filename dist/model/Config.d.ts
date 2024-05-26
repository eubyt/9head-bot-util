import { ColorResolvable } from 'discord.js';
interface ConfigData {
    Discord_User_ID_DEV: string[];
    Config_Discord_BOT: {
        id: string;
        token: string;
    };
    AutoVoiceChannel: {
        name: string;
        id: string;
    }[];
    PrivateVoiceChannel: {
        channelId: string;
        categoryId: string;
    }[];
    Embed: {
        default: ColorResolvable;
    };
}
type LangType = 'pt_BR';
type EnvType = 'development' | 'production';
export declare class Config {
    private NODE_ENV;
    static _config: ConfigData;
    private static _language;
    constructor(NODE_ENV?: EnvType);
    private validateEnv;
    private loadConfig;
    static getConfig(): ConfigData;
    static getConfig<T extends keyof ConfigData>(opt: T): ConfigData[T];
    static setConfig(config: ConfigData): void;
    static getLang(prop: string, lang?: LangType): string;
}
export {};
//# sourceMappingURL=Config.d.ts.map