import {
    AutocompleteInteraction,
    Client,
    ClientUser,
    CommandInteraction,
    Events,
    Interaction,
    Message,
    VoiceState,
} from 'discord.js';
import { Config } from './Config';
import { CommandHandle } from '../event/CommandHandle';
import { AutoVoiceChannel } from '../event/AutoVoiceChannel';
import { PrivateVoiceChannel } from '../event/PrivateVoiceChannel';
import { Logger } from './Logger';
import { FixLinks } from '../event/FixLinks';

interface TypeDiscordBot {
    client: Client;
    commandHandle: CommandHandle;
    autoVoiceChannel: AutoVoiceChannel | null;
    privateVoiceChannel: PrivateVoiceChannel | null;
    fixLinks: FixLinks | null;
    token?: string;
}

export class DiscordBot {
    constructor(private data_bot: TypeDiscordBot) {}

    public async start(): Promise<void> {
        this.registerListeners();
        await this.login();
    }

    // Registro de eventos
    private registerListeners(): void {
        const { client } = this.data_bot;

        client.on(Events.ClientReady, () => {
            this.onReady();
        });

        client.on(
            Events.MessageCreate,
            (message) => void this.onMessageCreate(message),
        );

        client.on(
            Events.InteractionCreate,
            (intr) => void this.onInteraction(intr),
        );

        client.on(
            Events.VoiceStateUpdate,
            (oldState, newState) =>
                void this.onVoiceStateUpdate(oldState, newState),
        );
    }

    // Logar o bot
    private async login(): Promise<void> {
        const { token, client } = this.data_bot;

        try {
            await client.login(
                token ?? Config.getConfigLocal().Config_Discord_BOT.token,
            );
            void Logger.info('Bot Login', 'Bot logged in successfully');
        } catch (err: unknown) {
            this.handleError('Bot Login', err);
        }
    }
    // Lidar com interações de comandos
    private async onInteraction(intr: Interaction): Promise<void> {
        const { commandHandle } = this.data_bot;
        if (
            intr instanceof CommandInteraction ||
            intr instanceof AutocompleteInteraction
        ) {
            try {
                await commandHandle.execute(intr);
            } catch (err: unknown) {
                this.handleError('Interaction Error', err);
            }
        }
    }

    private async onMessageCreate(message: Message) {
        const { fixLinks } = this.data_bot;

        if (message.author.id === message.client.user.id) {
            return;
        }

        if (fixLinks) {
            await fixLinks.execute(message);
        }
    }

    // Atualização de estado de voz
    private async onVoiceStateUpdate(
        oldState: VoiceState,
        newState: VoiceState,
    ): Promise<void> {
        const { autoVoiceChannel, privateVoiceChannel } = this.data_bot;
        if (privateVoiceChannel) {
            try {
                await privateVoiceChannel.execute(oldState, newState);
                void Logger.info(
                    'Voice State Update',
                    'Executed private voice channel update',
                );
            } catch (err: unknown) {
                this.handleError('Voice State Update (Private)', err);
            }
        }

        //////////////

        if (autoVoiceChannel) {
            try {
                await autoVoiceChannel.execute(oldState, newState);
                void Logger.info(
                    'Voice State Update',
                    'Executed auto voice channel update',
                );
            } catch (err: unknown) {
                this.handleError('Voice State Update (Auto)', err);
            }
        }
    }

    // Evento de bot pronto
    private onReady(): void {
        const { client } = this.data_bot;

        client.guilds.cache.forEach((guild) => {
            void Config.checkAndCreateGuildConfig(guild.id);
        });

        this.randomStatus(client.user);

        setInterval(
            () => {
                this.randomStatus(client.user);
            },
            1000 * 60 * 10,
        );

        void Logger.info('Bot Ready', 'Client is ready');
    }

    private randomStatus(userBot: ClientUser | null) {
        if (!userBot) return;

        userBot.setPresence(
            Config.statuses[Math.floor(Math.random() * Config.statuses.length)],
        );
    }

    private handleError(context: string, err: unknown): void {
        const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';
        void Logger.error(context, errorMessage);
    }
}
