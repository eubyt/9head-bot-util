import { CommandInteraction } from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Firestore } from 'firebase-admin/firestore';
export declare class CanalPrivadoCommand extends CommandCreator {
    db: Firestore;
    name: string;
    name_localizations: null;
    description: string;
    description_localizations: null;
    options: ({
        type: number;
        name: string;
        description: string;
        required: boolean;
        choices: {
            name: string;
            value: string;
        }[];
    } | {
        type: number;
        name: string;
        description: string;
        required: boolean;
        choices?: undefined;
    })[];
    constructor(db: Firestore);
    private update;
    execute(intr: CommandInteraction): Promise<void>;
}
//# sourceMappingURL=CanalPrivadoCommand.d.ts.map