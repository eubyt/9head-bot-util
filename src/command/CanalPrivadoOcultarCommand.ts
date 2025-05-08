import {
    ChannelType,
    CommandInteraction,
    OverwriteResolvable,
    VoiceChannel,
} from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Config } from '../model';
import { Logger } from '../model/Logger';
import { buildPrivateChannelPermissions } from '../event/PrivateVoiceChannel';

export class CanalPrivadoOcultarCommand extends CommandCreator {
    public name = 'canalprivado-ocultar';
    public name_localizations = null;

    // Descrição usando o arquivo de configurações
    public description = Config.getLang(
        'commands.canalprivado_ocultar.description',
    );
    public description_localizations = null;

    public options = [];

    async execute(intr: CommandInteraction): Promise<void> {
        const userId = intr.user.id;
        const guildId = intr.guildId;
        const guild = intr.guild;

        await intr.deferReply({ ephemeral: true });

        if (!guildId) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_ocultar.error_messages.erro_title',
                ),
                Config.getLang('commands.error_messages.guild_not_found'),
                userId,
            );
            return;
        }

        // Verifica se o usuário possui um canal privado
        const db = Config.getGuildCollection(guildId);
        const privateChannelDoc = await db
            .collection('privateVoiceChannels')
            .doc(userId)
            .get();

        if (!privateChannelDoc.exists) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_ocultar.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_ocultar.error_messages.no_private_channel',
                ),
                userId,
            );
            return;
        }

        const privateChannelData = privateChannelDoc.data();
        if (!privateChannelData) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_ocultar.error_messages.erro_title',
                ),
                Config.getLang('commands.error_messages.data_not_found'),
                userId,
            );
            return;
        }

        const { channelName, hidden, permissions } = privateChannelData as {
            channelName: string;
            permissions: string[];
            hidden: boolean;
        };

        if (!guild) return;

        const channel = guild.channels.cache.find(
            (ch) =>
                ch.name === channelName && ch.type === ChannelType.GuildVoice,
        );

        if (channel) {
            const permissionOverwrites: OverwriteResolvable[] =
                buildPrivateChannelPermissions(guild, permissions, hidden);

            await (channel as VoiceChannel).permissionOverwrites.set(
                permissionOverwrites,
            );
        }

        const newHiddenValue = !hidden;
        try {
            await privateChannelDoc.ref.update({
                hidden: newHiddenValue,
            });

            const statusMessage = newHiddenValue
                ? Config.getLang(
                      'commands.canalprivado_ocultar.ocultar_ativado',
                  )
                : Config.getLang(
                      'commands.canalprivado_ocultar.ocultar_desativado',
                  );

            const description = Config.getLang(
                'commands.canalprivado_ocultar.success_messages.ocultar_toggled',
            )
                .replace('{{channelName}}', channelName)
                .replace('{{status}}', statusMessage);

            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_ocultar.success_messages.sucess_title',
                ),
                description,
                userId,
            );

            Logger.info(
                'CanalPrivadoOcultarCommand',
                `Ocultar do canal ${channelName} alterada para: ${statusMessage}`,
            );
        } catch (error) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_ocultar.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_ocultar.error_messages.persistencia_error',
                ),
                userId,
            );
            Logger.error(
                'CanalPrivadoOcultarCommand',
                `Erro ao alterar ocultar do canal ${channelName}: ${String(
                    error,
                )}`,
            );
        }
    }
}
