import { CommandInteraction } from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Loader } from '../util/Loader';
import { Config } from '../model';

export class PingCommand extends CommandCreator {
    public name = 'ping';
    public name_localizations = null;

    public description = '「Discord」 Verificar a latência do bot.';
    public description_localizations = null;

    public options = [];

    async execute(intr: CommandInteraction): Promise<void> {
        const sent = await intr.reply({
            content: Config.getLang('commands.ping.latency_test'),
            files: [
                Loader.image(
                    `../static/math_equation/${Math.floor(Math.random() * 3 + 1).toString()}.png`,
                    'resolve_this.png',
                ),
            ],
            fetchReply: true,
        });

        const latency_roundtrip = Math.round(
            sent.createdTimestamp - intr.createdTimestamp,
        ).toString();
        const websocket_heartbeat = intr.client.ws.ping.toString();

        let description = `Roundtrip: \x1b[2;31m${latency_roundtrip}ms\x1b[0m\n`;

        if (websocket_heartbeat !== '-1') {
            description += `WebSocket: \x1b[2;31m${websocket_heartbeat}ms\x1b[0m`;
        }

        const PingEmbed = this.BasicEmbed(intr.user)
            .setTitle(Config.getLang('commands.ping.title'))
            .setDescription(`\`\`\`ansi\n${description}\n\`\`\``);

        await intr.editReply({
            content: '',
            files: [],
            embeds: [PingEmbed],
        });
    }
}
