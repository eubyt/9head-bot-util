"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PingCommand = void 0;
const CommandBot_1 = require("./CommandBot");
const Loader_1 = require("../util/Loader");
const model_1 = require("../model");
class PingCommand extends CommandBot_1.CommandCreator {
    constructor() {
        super(...arguments);
        this.name = 'ping';
        this.name_localizations = null;
        this.description = '「Discord」 Verificar a latência do bot.';
        this.description_localizations = null;
        this.options = [];
    }
    async execute(intr) {
        const sent = await intr.reply({
            content: model_1.Config.getLang('commands.ping.latency_test'),
            files: [
                Loader_1.Loader.image(`../static/math_equation/${Math.floor(Math.random() * 3 + 1).toString()}.png`, 'resolve_this.png'),
            ],
            fetchReply: true,
        });
        const latency_roundtrip = Math.round(sent.createdTimestamp - intr.createdTimestamp).toString();
        const websocket_heartbeat = intr.client.ws.ping.toString();
        let description = `Roundtrip: \x1b[2;31m${latency_roundtrip}ms\x1b[0m\n`;
        if (websocket_heartbeat !== '-1') {
            description += `WebSocket: \x1b[2;31m${websocket_heartbeat}ms\x1b[0m`;
        }
        const PingEmbed = this.BasicEmbed(intr.user)
            .setTitle(model_1.Config.getLang('commands.ping.title'))
            .setDescription(`\`\`\`ansi\n${description}\n\`\`\``);
        await intr.editReply({
            content: '',
            files: [],
            embeds: [PingEmbed],
        });
    }
}
exports.PingCommand = PingCommand;
//# sourceMappingURL=PingCommand.js.map