import { config as dotenvConfig } from 'dotenv'; // Importar o dotenv
import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { CommandHandle } from './event/CommandHandle';
import { CommandCreator, PingCommand } from './command';
import { Config, DiscordBot } from './model';
import { AutoVoiceChannel } from './event/AutoVoiceChannel';
import { PrivateVoiceChannel } from './event/PrivateVoiceChannel';
import { ServiceAccount, initializeApp } from 'firebase-admin/app';
import { credential, firestore } from 'firebase-admin';
import { CanalPrivadoCommand } from './command/CanalPrivadoCommand';
import { CanalPrivadoRenameCommand } from './command/CanalPrivadoRenameCommand';
import { CanalPrivadoPersistenciaCommand } from './command/CanalPrivadoPersistenciaCommand';
import { Logger } from './model/Logger';
import { SetAutoVoiceChannelCommand } from './command/SetAutoVoiceChannelCommand';
import { SetPrivateChannelCommand } from './command/SetPrivateChannelCommand';
import { FixLinks } from './event/FixLinks';
import { SetChannelCommand } from './command/SetChannelCommand';
import { ChannelCheckEvent } from './event/ChannelCheckEvent';
import { NineHeadMention } from './event/NineHeadMention';
import { CanalPrivadoOcultarCommand } from './command/CanalPrivadoOcultarCommand';

// Carregar variáveis de ambiente do arquivo .env
dotenvConfig();

async function start(): Promise<void> {
    if (!process.env.DISCORD_WEB_HOOK_LOG) {
        throw new Error('Env DISCORD_WEB_HOOK_LOG invalid...');
    }

    Logger.init(process.env.DISCORD_WEB_HOOK_LOG);

    if (!process.env.FIREBASE_ADMIN) {
        Logger.error('Firebase Configuration', 'Chave Firebase admin inválida');
        throw new Error('Firebase key admin invalid');
    }

    try {
        initializeApp({
            credential: credential.cert(
                JSON.parse(process.env.FIREBASE_ADMIN) as ServiceAccount,
            ),
        });

        Logger.info(
            'Firebase Initialization',
            'Inicialização do Firebase realizada com sucesso',
        );
    } catch (error) {
        if (error instanceof Error) {
            Logger.error(
                'Firebase Initialization',
                `Erro ao inicializar o Firebase: ${error.message}`,
            );
        } else {
            Logger.error(
                'Firebase Initialization',
                'Erro desconhecido ao inicializar o Firebase',
            );
        }
        throw error;
    }

    new Config();
    const db = firestore();
    Config.setDatabase(db);

    Logger.info(
        'Bot Initialization',
        'Iniciando o processo de inicialização do bot...',
    );

    // Criar os Eventos
    const commandHandle = new CommandHandle([
        new SetAutoVoiceChannelCommand(),
        new SetPrivateChannelCommand(),
        new PingCommand(),
        new CanalPrivadoCommand(),
        new CanalPrivadoRenameCommand(),
        new CanalPrivadoPersistenciaCommand(),
        new CanalPrivadoOcultarCommand(),
        new SetChannelCommand(),
    ]);

    const bot = new DiscordBot({
        commandHandle,

        autoVoiceChannel: new AutoVoiceChannel(),
        privateVoiceChannel: new PrivateVoiceChannel(),
        fixLinks: new FixLinks(),
        channelCheckEvent: new ChannelCheckEvent(),
        NineHeadMention: new NineHeadMention(),

        client: new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildEmojisAndStickers,
                GatewayIntentBits.GuildIntegrations,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildScheduledEvents,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildWebhooks,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageTyping,
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.MessageContent,
            ],
            partials: [
                Partials.Channel,
                Partials.GuildMember,
                Partials.GuildScheduledEvent,
                Partials.Message,
                Partials.Reaction,
                Partials.ThreadMember,
                Partials.User,
            ],
            allowedMentions: {
                parse: ['everyone', 'roles', 'users'],
            },
        }),
    });

    // Registrar os comandos
    const { token, id } = Config.getConfigLocal().Config_Discord_BOT;
    const rest = new REST({ version: '10' }).setToken(token);

    Logger.info(
        'Command Registration',
        'Iniciando o processo de registro de comandos...',
    );

    try {
        await rest.put(Routes.applicationCommands(id), {
            body: commandHandle.commands.map((command) =>
                (command as CommandCreator).getJSON(),
            ),
        });

        Logger.info(
            'Command Registration',
            'Comandos registrados com sucesso no Discord',
        );
    } catch (error) {
        if (error instanceof Error) {
            Logger.error(
                'Command Registration',
                `Erro ao registrar comandos no Discord: ${error.message}`,
            );
        } else {
            Logger.error(
                'Command Registration',
                'Erro desconhecido ao registrar comandos no Discord',
            );
        }
        throw error;
    }

    try {
        await bot.start();
        Logger.info(
            'Bot Startup',
            'Bot iniciado com sucesso e funcionando normalmente',
        );
    } catch (error) {
        if (error instanceof Error) {
            Logger.error(
                'Bot Startup',
                `Erro ao iniciar o bot: ${error.message}`,
            );
        } else {
            Logger.error('Bot Startup', 'Erro desconhecido ao iniciar o bot');
        }
        throw error;
    }
}

start().catch((err: unknown) => {
    if (err instanceof Error) {
        Logger.error(
            'Application Error',
            `Erro não tratado na execução da aplicação: ${err.message}`,
        );
    } else {
        Logger.error(
            'Application Error',
            'Erro desconhecido na execução da aplicação',
        );
    }
});
