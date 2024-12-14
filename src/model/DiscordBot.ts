import {
    AutocompleteInteraction,
    Client,
    CommandInteraction,
    Events,
    Interaction,
    VoiceState,
} from 'discord.js';
import { Config } from './Config';
import { CommandHandle } from '../event/CommandHandle';
import { AutoVoiceChannel } from '../event/AutoVoiceChannel';
import { PrivateVoiceChannel } from '../event/PrivateVoiceChannel';
import { Logger } from './Logger';

interface TypeDiscordBot {
    client: Client;
    commandHandle: CommandHandle;
    autoVoiceChannel: AutoVoiceChannel | null;
    privateVoiceChannel: PrivateVoiceChannel | null;
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
            Logger.info('Bot Login', 'Bot logged in successfully');
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
                const configGuild = undefined;

                // if (intr.guildId) {
                //     configGuild = await Config.getConfig(intr.guildId);
                // }

                await commandHandle.execute(intr, configGuild);
            } catch (err: unknown) {
                this.handleError('Interaction Error', err);
            }
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
                Logger.info(
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
                Logger.info(
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
            console.log(guild.id);
            void Config.checkAndCreateGuildConfig(guild.id);
        });

        Logger.info('Bot Ready', 'Client is ready');
    }

    // Centralização do tratamento de erro
    private handleError(context: string, err: unknown): void {
        const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';
        void Logger.error(context, errorMessage);
    }
}
