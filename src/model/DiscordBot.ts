import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
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
import { ChannelCheckEvent } from '../event/ChannelCheckEvent';
import { ServerLogger } from '../logger/ServerLogger';
import { initializeInviteTracking } from '../logger/LogJoinLeave';
import { NineHeadMention } from '../event/NineHeadMention';

interface TypeDiscordBot {
    client: Client;
    commandHandle: CommandHandle;
    autoVoiceChannel: AutoVoiceChannel | null;
    privateVoiceChannel: PrivateVoiceChannel | null;
    fixLinks: FixLinks | null;
    channelCheckEvent: ChannelCheckEvent | null;
    NineHeadMention: NineHeadMention | null;
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
            new ServerLogger(client);
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
            intr instanceof ChatInputCommandInteraction ||
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
        const { fixLinks, channelCheckEvent, NineHeadMention } = this.data_bot;

        if (message.author.id === message.client.user.id) {
            return;
        }

        // Reagir com emotes personalizados para usuários específicos

        if (
            (message.author.id === '425754513832411146' ||
                message.author.id === '245659496758640650' ||
                message.author.id === '776111846096109568' ||
                message.author.id === '286701345090830336') &&
            !message.author.bot
        ) {
            const CUSTOM_EMOTES = [
                '1318681145495388260',
                '1318680845091078194',
                '1318680832889589823',
                '1318680819333726228',
                '1318680802719957042',
                '1318680788488949780',
                '1318680772336418937',
                '1318680758025719880',
                '1318680744226197623',
                '1318680727918874684',
                '1030829791550644404',
                '1031943269594177567',
                '1307353470101098576',
                '1031288452077064222',
                '1030827083523432578',
                '🤓',
                '😎',
                '🦶',
            ];

            const randomEmoteId =
                CUSTOM_EMOTES[Math.floor(Math.random() * CUSTOM_EMOTES.length)];

            const shouldReact = Math.random() < 0.01;

            if (shouldReact) {
                if (message.author.id === '776111846096109568') {
                    await message.react('🏳️‍🌈');
                } else await message.react(randomEmoteId);
            }
        }

        if (fixLinks) {
            await fixLinks.execute(message);
        }

        if (channelCheckEvent) {
            await channelCheckEvent.execute(message);
        }

        if (NineHeadMention) {
            NineHeadMention.execute(message);
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
            void Config.checkAndCreateGuildConfig(guild.id);
            void initializeInviteTracking(guild);
        });

        this.randomStatus(client.user);

        setInterval(
            () => {
                this.randomStatus(client.user);
            },
            1000 * 60 * 10,
        );

        Logger.info('Bot Ready', 'Client is ready');
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
        Logger.error(context, errorMessage);
    }
}
