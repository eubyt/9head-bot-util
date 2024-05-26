import { Client } from 'discord.js';
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
export declare class DiscordBot {
    private data_bot;
    constructor(data_bot: TypeDiscordBot);
    start(): Promise<void>;
    private registerListeners;
    private login;
    private onInteraction;
    private onVoiceStateUpdate;
    private onReady;
}
export {};
//# sourceMappingURL=DiscordBot.d.ts.map