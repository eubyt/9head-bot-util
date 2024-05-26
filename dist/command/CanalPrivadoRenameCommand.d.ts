import { CommandInteraction } from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Firestore } from 'firebase-admin/firestore';
export declare class CanalPrivadoRenameCommand extends CommandCreator {
    db: Firestore;
    name: string;
    name_localizations: null;
    description: string;
    description_localizations: null;
    options: {
        type: number;
        name: string;
        description: string;
        required: boolean;
    }[];
    constructor(db: Firestore);
    execute(intr: CommandInteraction): Promise<void>;
}
//# sourceMappingURL=CanalPrivadoRenameCommand.d.ts.map