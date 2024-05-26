import { EventHandler } from './EventHandler';
import { VoiceState } from 'discord.js';
import { Firestore } from 'firebase-admin/firestore';
export declare class PrivateVoiceChannel implements EventHandler<'VoiceState'> {
    categoryId: {
        categoryId: string;
        channelId: string;
    }[];
    db: Firestore;
    constructor(categoryId: {
        categoryId: string;
        channelId: string;
    }[], db: Firestore);
    execute(oldState: VoiceState, newState: VoiceState): Promise<void>;
    private findExistingChannel;
}
//# sourceMappingURL=PrivateVoiceChannel.d.ts.map