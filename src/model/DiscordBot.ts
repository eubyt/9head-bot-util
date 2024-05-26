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

interface TypeDiscordBot {
    client: Client;
    commandHandle: CommandHandle;
    autoVoiceChannel: AutoVoiceChannel;
    privateVoiceChannel: PrivateVoiceChannel;
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

        client.on(Events.InteractionCreate, (intr) => {
            this.onInteraction(intr);
        });

        client.on(Events.VoiceStateUpdate, (oldState, newState) => {
            void this.onVoiceStateUpdate(oldState, newState);
        });
    }

    // Logar o bot
    private async login(): Promise<void> {
        const { token, client } = this.data_bot;
        try {
            await client.login(
                token ?? Config.getConfig('Config_Discord_BOT').token,
            );
        } catch (err) {
            console.log(err);
        }
    }

    private onInteraction(intr: Interaction) {
        const { commandHandle } = this.data_bot;
        if (
            intr instanceof CommandInteraction ||
            intr instanceof AutocompleteInteraction
        ) {
            commandHandle.execute(intr).catch((err: unknown) => {
                console.log(err);
            });
        }
    }

    private async onVoiceStateUpdate(
        oldState: VoiceState,
        newState: VoiceState,
    ) {
        const { autoVoiceChannel, privateVoiceChannel } = this.data_bot;

        await privateVoiceChannel.execute(oldState, newState);
        await autoVoiceChannel.execute(oldState, newState);
    }

    private onReady(): void {
        console.log('Client carregado');
    }
}
