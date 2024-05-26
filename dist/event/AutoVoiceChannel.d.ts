import { EventHandler } from './EventHandler';
import { VoiceState } from 'discord.js';
export declare class AutoVoiceChannel implements EventHandler<'VoiceState'> {
    categoryId: {
        name: string;
        id: string;
    }[];
    constructor(categoryId: {
        name: string;
        id: string;
    }[]);
    execute(oldState: VoiceState, newState: VoiceState): Promise<void>;
}
//# sourceMappingURL=AutoVoiceChannel.d.ts.map