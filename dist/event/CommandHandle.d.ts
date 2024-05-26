import { CommandInteraction, AutocompleteInteraction } from 'discord.js';
import { EventHandler } from './EventHandler';
import { CommandBot } from '../command/CommandBot';
export declare class CommandHandle implements EventHandler<'Command'> {
    commands: CommandBot[];
    constructor(commands: CommandBot[]);
    execute(intr: CommandInteraction | AutocompleteInteraction): Promise<void>;
}
//# sourceMappingURL=CommandHandle.d.ts.map