import { ColorResolvable } from 'discord.js';
import { Loader } from '../util/Loader';

interface ConfigData {
    Discord_User_ID_DEV: string[];
    Config_Discord_BOT: {
        id: string;
        token: string;
    };
    AutoVoiceChannel: {
        name: string;
        categoryId: string;
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
const ALLOWED_NODE_ENV: EnvType[] = ['development', 'production'];

export class Config {
    public static _config: ConfigData;
    private static _language: Record<LangType, Record<string, unknown>> = {
        pt_BR: {},
    };

    constructor(private NODE_ENV: EnvType = process.env.NODE_ENV as EnvType) {
        this.validateEnv();
        this.loadConfig();
    }

    private validateEnv() {
        if (!ALLOWED_NODE_ENV.includes(this.NODE_ENV)) {
            throw new Error(
                `Invalid NODE_ENV value: ${this.NODE_ENV}. It must be either 'development' or 'production'.`,
            );
        }
    }

    private loadConfig() {
        console.log(`Loading ${this.NODE_ENV} config....`);

        try {
            // Carregando o arquivo de configuração
            const configLoader = Loader.JSON(
                `../config/${this.NODE_ENV}.json`,
            ) as unknown as ConfigData;

            // Carrega dados do Discord a partir das variáveis de ambiente
            configLoader.Config_Discord_BOT = {
                id: process.env.DISCORD_ID ?? 'invalid',
                token: process.env.DISCORD_TOKEN ?? 'invalid',
            };

            // Define a configuração
            Config.setConfig(configLoader);
        } catch (err: unknown) {
            // Lida com erro ao carregar configuração
            throw new Error(
                `Configuration file is missing or invalid: ${
                    err instanceof Error ? err.message : 'Unknown error'
                }`,
            );
        }
    }

    public static getConfig(): ConfigData;
    public static getConfig<T extends keyof ConfigData>(opt: T): ConfigData[T];
    public static getConfig<T extends keyof ConfigData>(opt?: T) {
        if (opt) return this._config[opt];
        return this._config;
    }

    public static setConfig(config: ConfigData) {
        this._config = config;
    }

    // Melhorando o carregamento de idiomas e garantindo que erros sejam tratados
    public static getLang(prop: string, lang: LangType = 'pt_BR') {
        // Se não carregou ainda, tenta carregar o arquivo de idioma
        if (Object.keys(this._language[lang]).length === 0) {
            try {
                const langData = Loader.JSON(`../lang/${lang}.json`);
                console.log('Idioma carregado:', langData); // Verifica se o arquivo foi carregado corretamente
                this._language[lang] = langData;
            } catch (err: unknown) {
                if (err instanceof Error) {
                    // Caso o erro seja uma instância de Error
                    throw new Error(
                        `Configuration file for language "${lang}" is missing or invalid: ${err.message}`,
                    );
                } else {
                    // Caso o erro não seja um Error válido
                    throw new Error(
                        `Configuration file for language "${lang}" is missing or invalid, and the error is not an instance of Error.`,
                    );
                }
            }
        }

        const data = this._language[lang];
        const result = prop
            .split('.')
            .reduce<Record<string, unknown> | undefined>((v, c) => {
                if (v && typeof v === 'object' && v[c] !== undefined) {
                    return v[c] as Record<string, unknown>;
                }
                return undefined;
            }, data) as unknown;

        if (typeof result === 'string' || typeof result === 'number') {
            return result.toString();
        }

        // Adiciona log para depuração do tipo do valor retornado
        throw new Error(
            `"${prop}" must be a string or number, but got ${typeof result}`,
        );
    }
}
