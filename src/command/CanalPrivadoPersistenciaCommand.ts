import { CommandInteraction } from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Config } from '../model';
import { Logger } from '../model/Logger';

export class CanalPrivadoPersistenciaCommand extends CommandCreator {
    public name = 'canalprivado-persistencia';
    public name_localizations = null;

    // Descrição usando o arquivo de configurações
    public description = Config.getLang(
        'commands.canalprivado_persistencia.description',
    );
    public description_localizations = null;

    public options = [];

    async execute(intr: CommandInteraction): Promise<void> {
        const userId = intr.user.id;
        const guildId = intr.guildId;

        await intr.deferReply({ ephemeral: true });

        if (!guildId) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.erro_title',
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
                    'commands.canalprivado_persistencia.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.no_private_channel',
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
                    'commands.canalprivado_persistencia.error_messages.erro_title',
                ),
                Config.getLang('commands.error_messages.data_not_found'),
                userId,
            );
            return;
        }

        const { channelName, persistente } = privateChannelData as {
            channelName: string;
            permissions: string[];
            persistente: boolean;
        };

        const newPersistenteValue = !persistente;
        try {
            await privateChannelDoc.ref.update({
                persistente: newPersistenteValue,
            });

            const statusMessage = newPersistenteValue
                ? Config.getLang(
                      'commands.canalprivado_persistencia.persistencia_ativada',
                  )
                : Config.getLang(
                      'commands.canalprivado_persistencia.persistencia_desativada',
                  );

            const description = Config.getLang(
                'commands.canalprivado_persistencia.success_messages.persistencia_toggled',
            )
                .replace('{{channelName}}', channelName)
                .replace('{{status}}', statusMessage);

            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.success_messages.sucess_title',
                ),
                description,
                userId,
            );

            Logger.info(
                'CanalPrivadoPersistenciaCommand',
                `Persistência do canal ${channelName} alterada para: ${statusMessage}`,
            );
        } catch (error) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.persistencia_error',
                ),
                userId,
            );
            Logger.error(
                'CanalPrivadoPersistenciaCommand',
                `Erro ao alterar persistência do canal ${channelName}: ${String(
                    error,
                )}`,
            );
        }
    }
}
