"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandHandle = void 0;
const discord_js_1 = require("discord.js");
class CommandHandle {
    constructor(commands) {
        this.commands = commands;
    }
    async execute(intr) {
        // Não responder si mesmo ou bots...
        if (intr.user.id === intr.client.user.id || intr.user.bot) {
            return;
        }
        const { commandName } = intr;
        const command = this.commands.filter((command) => command.name === commandName)[0];
        if (intr instanceof discord_js_1.AutocompleteInteraction)
            return;
        await command.execute(intr);
    }
}
exports.CommandHandle = CommandHandle;
//# sourceMappingURL=CommandHandle.js.map