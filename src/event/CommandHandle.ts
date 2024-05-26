import { CommandInteraction, AutocompleteInteraction } from 'discord.js';
import { EventHandler } from './EventHandler';
import { CommandBot } from '../command/CommandBot';

export class CommandHandle implements EventHandler<'Command'> {
    constructor(public commands: CommandBot[]) {}

    async execute(intr: CommandInteraction | AutocompleteInteraction) {
        // Não responder si mesmo ou bots...
        if (intr.user.id === intr.client.user.id || intr.user.bot) {
            return;
        }

        const { commandName } = intr;

        const command = this.commands.filter(
            (command) => command.name === commandName,
        )[0];

        if (intr instanceof AutocompleteInteraction) return;

        await command.execute(intr);
    }
}
