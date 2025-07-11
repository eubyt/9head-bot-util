import { ActivityType, ColorResolvable, PresenceData } from 'discord.js';
import { Loader } from '../util/Loader';
import { Logger } from './Logger';
import { Firestore } from 'firebase-admin/firestore';

export interface ConfigData {
    twitch: {
        channels: string[];
        identity: {
            username: string;
            clientId: string;
            clientSecret: string;
            refreshToken: string;
        };
    };
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
    CommandChannel: string;
    FmBotChannel: string;
    KarutaChannel: string;
    MudaeChannel: string;
    CounterChannel: string;
    CounterChannelAmount: number;
    CounterChannelRule: string;
    FishingChannel: string;
    AkinatorChannel: string;
    NivelChannel: string;
    LoggerChannel: string;
    BanLoggerChannel: string;
    Embed: {
        default: ColorResolvable;
    };
    NineHead: {
        serverMention: string;
        nineHeadServer: string;
        webhook: string;
        webhookStreamMod: string;
        channelNewsMention: {
            skyblockNews: string;
            skyblockChangeVersion: string;
            skyblockCalendar: string;
            skyblockMiningFiesta: string;
            dbdNews: string;
            dbdCode: string;
        };
        pingRole: {
            skyblockNews: string;
            skyblockFireSale: string;
            skyblockSpooky: string;
            skyblockJerryWorkshop: string;
            skyblockNewYear: string;
            skyblockSeasonOfJerry: string;
            skyblockElection: string;
            skyblockTravellingZoo: string;
            skyblockDarkAuction: string;
            skyblockFear: string;
            skyblockFestivel: string;
            skyblockHunt: string;
            skyblockFiesta: string;
            skyblockMythological: string;
            dbdNewsPing: string;
            dbdTempoFila: string;
            dbdCodePing: string;
            karutaPing: string;
        };
        gameChannel: {
            skyblock: string;
            dbd: string;
        };
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
    private static db: Firestore = new Firestore();

    public static configCache = new Map<
        string,
        Omit<
            ConfigData,
            'Discord_User_ID_DEV' | 'Config_Discord_BOT' | 'NineHead' | 'twitch'
        >
    >();

    public static statuses: PresenceData[] = [
        {
            status: 'online',
            activities: [
                {
                    name: 'Um louvor para mim...',
                    type: ActivityType.Listening,
                },
            ],
        },
        {
            status: 'dnd',
            activities: [
                {
                    name: 'Deus, pátria, família e liberdade...',
                    type: ActivityType.Watching,
                },
            ],
        },
        {
            status: 'dnd',
            activities: [
                {
                    name: 'Dead by Daylight',
                    type: ActivityType.Competing,
                },
            ],
        },
        {
            status: 'idle',
            activities: [
                {
                    name: 'https://www.youtube.com/watch?v=2MTWu0lNVF4',
                    type: ActivityType.Custom,
                },
            ],
        },
        {
            status: 'idle',
            activities: [
                {
                    name: 'Exposed da 9Head...',
                    type: ActivityType.Listening,
                },
            ],
        },
        {
            status: 'dnd',
            activities: [
                {
                    name: 'Ban do eubyt...',
                    type: ActivityType.Watching,
                },
            ],
        },
        {
            status: 'idle',
            activities: [
                {
                    name: '⁠Bilhões faz falta né?',
                    type: ActivityType.Custom,
                },
            ],
        },
        {
            status: 'dnd',
            activities: [
                {
                    name: 'Toram Online',
                    type: ActivityType.Playing,
                },
            ],
        },
        {
            status: 'dnd',
            activities: [
                {
                    name: 'Cyberbugs 2077',
                    type: ActivityType.Playing,
                },
            ],
        },
        {
            status: 'dnd',
            activities: [
                {
                    name: 'Fortune Tiger',
                    type: ActivityType.Playing,
                },
            ],
        },
        {
            status: 'dnd',
            activities: [
                {
                    name: 'Plataforma nova pagando...',
                    type: ActivityType.Watching,
                },
            ],
        },
        {
            status: 'dnd',
            activities: [
                {
                    name: 'Sable Ward X Ghost Face...',
                    type: ActivityType.Watching,
                },
            ],
        },
    ];

    constructor(private NODE_ENV: EnvType = process.env.NODE_ENV as EnvType) {
        this.validateEnv();
        this.loadConfig();
    }

    private validateEnv() {
        if (!ALLOWED_NODE_ENV.includes(this.NODE_ENV)) {
            const errorMessage = `Invalid NODE_ENV value: ${this.NODE_ENV}. It must be either 'development' or 'production'.`;
            Logger.error('Config Validation', errorMessage);
            return;
        }
        Logger.info('Config Validation', `NODE_ENV set to: ${this.NODE_ENV}`);
    }

    private loadConfig() {
        Logger.info('Config Loading', `Loading ${this.NODE_ENV} config....`);

        try {
            const configLoader = Loader.JSON(
                `../config/${this.NODE_ENV}.json`,
            ) as unknown as ConfigData;

            configLoader.Config_Discord_BOT = {
                id: process.env.DISCORD_ID ?? 'invalid',
                token: process.env.DISCORD_TOKEN ?? 'invalid',
            };

            configLoader.NineHead.webhookStreamMod =
                process.env.NINEHEAD_WEB_HOOK_STREAM_MOD ?? 'invalid';

            configLoader.NineHead.webhook =
                process.env.NINEHEAD_WEB_HOOK ?? 'invalid';

            configLoader.twitch.identity.clientId =
                process.env.TWITCH_ID_CLIENT ?? 'invalid';

            configLoader.twitch.identity.clientSecret =
                process.env.TWITCH_CLIENT_SECRET ?? 'invalid';

            configLoader.twitch.identity.refreshToken =
                process.env.TWITCH_REFRESH_TOKEN ?? 'invalid';

            Config.setConfig(configLoader);

            Logger.info(
                'Config Loading',
                'Configuração carregada com sucesso.',
            );
        } catch (err: unknown) {
            const errorMessage = `Configuration file is missing or invalid: ${
                err instanceof Error ? err.message : 'Unknown error'
            }`;
            Logger.error('Config Loading', errorMessage);
            return;
        }
    }

    public static getConfigLocal(): ConfigData {
        return this._config;
    }

    public static async getConfig(guildId: string) {
        return await Config.checkAndCreateGuildConfig(guildId);
    }

    public static setConfig(config: ConfigData) {
        this._config = config;
    }

    public static setDatabase(db: Firestore) {
        this.db = db;
    }

    public static async checkAndCreateGuildConfig(guildId: string) {
        // Verificar se o cache já possui a configuração
        if (this.configCache.has(guildId)) {
            Logger.info('Config Guild', 'Usando Cache');
            return this.configCache.get(guildId);
        }

        const guildConfigRef = this.db.collection('guilds').doc(guildId);
        const guildConfigDoc = await guildConfigRef.get();

        const defaultConfig: Omit<
            ConfigData,
            'Discord_User_ID_DEV' | 'Config_Discord_BOT' | 'NineHead' | 'twitch'
        > = {
            AutoVoiceChannel: [],
            PrivateVoiceChannel: [],
            CommandChannel: 'null',
            FmBotChannel: 'null',
            AkinatorChannel: 'null',
            KarutaChannel: 'null',
            MudaeChannel: 'null',
            CounterChannel: 'null',
            CounterChannelRule: 'null',
            CounterChannelAmount: 0,
            FishingChannel: 'null',
            NivelChannel: 'null',
            LoggerChannel: 'null',
            BanLoggerChannel: 'null',
            Embed: {
                default: '#000000',
            },
        };

        let guildConfig: typeof defaultConfig;

        if (!guildConfigDoc.exists) {
            // Criar nova configuração se não existir
            await guildConfigRef.set(defaultConfig);
            guildConfig = defaultConfig;

            Logger.info(
                'Guild Config Creation',
                `Configuração criada para a guild ${guildId}`,
            );
        } else {
            // Carregar configuração existente
            const existingConfig = guildConfigDoc.data() as Partial<
                typeof defaultConfig
            >;
            guildConfig = { ...defaultConfig, ...existingConfig };

            // Atualizar campos ausentes na configuração existente
            const missingFields = Object.keys(defaultConfig).filter(
                (key): key is keyof typeof defaultConfig =>
                    !(key in existingConfig),
            );

            if (missingFields.length > 0) {
                missingFields.forEach((key) => {
                    (guildConfig[key] as any) = defaultConfig[key];
                });

                await guildConfigRef.set(guildConfig);
                Logger.info(
                    'Guild Config Update',
                    `Configuração atualizada para a guild ${guildId}. Campos ausentes adicionados: ${missingFields.join(
                        ', ',
                    )}`,
                );
            }
        }

        // Adicionar ao cache
        this.configCache.set(guildId, guildConfig);

        return guildConfig;
    }

    public static getGuildCollection(guildId: string) {
        return this.db.collection('guilds').doc(guildId);
    }

    public static getLang(prop: string, lang: LangType = 'pt_BR') {
        if (Object.keys(this._language[lang]).length === 0) {
            try {
                const langData = Loader.JSON(`../lang/${lang}.json`);
                Logger.info(
                    'Lang Loading',
                    `Idioma ${lang} carregado com sucesso.`,
                );
                this._language[lang] = langData;
            } catch (err: unknown) {
                const errorMessage = `Configuration file for language "${lang}" is missing or invalid: ${
                    err instanceof Error ? err.message : 'Unknown error'
                }`;
                Logger.error('Lang Loading', errorMessage);
                return 'Invalid';
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

        const errorMessage = `"${prop}" must be a string or number, but got ${typeof result}`;
        Logger.error('Lang Loading', errorMessage);
        return 'Invalid';
    }
}
