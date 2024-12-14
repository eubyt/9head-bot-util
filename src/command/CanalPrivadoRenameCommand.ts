import {
    CommandInteraction,
    ChannelType,
    VoiceChannel,
    GuildMember,
} from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Firestore } from 'firebase-admin/firestore';
import { Config } from '../model';
import { Logger } from '../model/Logger'; // Supondo que o Logger seja importado de um arquivo

export class CanalPrivadoRenameCommand extends CommandCreator {
    public name = 'canalprivado-rename';
    public name_localizations = null;

    public description = Config.getLang(
        'commands.canalprivado_rename.description',
    );
    public description_localizations = null;

    public options = [
        {
            type: 3,
            name: 'nome',
            description: Config.getLang(
                'commands.canalprivado_rename.options.nome.description',
            ),
            required: true,
        },
    ];

    constructor(public db: Firestore) {
        super();
    }

    async execute(intr: CommandInteraction) {
        await intr.deferReply({ ephemeral: true });

        const newName = intr.options.get('nome', true).value as string;
        Logger.info(
            'CanalPrivadoRenameCommand',
            `Novo nome recebido: ${newName}`,
        );

        if (newName.length > 32) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                'Nome do canal excedeu o limite de 32 caracteres.',
            );
            await intr.editReply({
                content: Config.getLang(
                    'commands.canalprivado_rename.error_messages.channel_name_too_long',
                ),
            });
            return;
        }

        const docRef = this.db
            .collection('privateVoiceChannels')
            .doc(intr.user.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                `Usuário ${intr.user.id} não tem um canal privado.`,
            );
            await intr.editReply({
                content: Config.getLang(
                    'commands.canalprivado_rename.error_messages.no_private_channel',
                ),
            });
            return;
        }

        const data = doc.data() as {
            channelName: string;
            permissions: string[];
        };
        const privateChannelName = data.channelName;
        Logger.info(
            'CanalPrivadoRenameCommand',
            `Nome do canal privado no Firestore: ${privateChannelName}`,
        );

        const channel = intr.guild?.channels.cache.find(
            (ch) =>
                ch.name === privateChannelName &&
                ch.type === ChannelType.GuildVoice,
        ) as VoiceChannel | undefined;

        if (!channel) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                `Canal ${privateChannelName} não encontrado no servidor.`,
            );
            await intr.editReply({
                content: Config.getLang(
                    'commands.canalprivado_rename.error_messages.channel_not_found',
                ),
            });
            return;
        }

        const botMember = intr.guild?.members.me;
        if (
            !botMember ||
            !channel.permissionsFor(botMember).has('ManageChannels')
        ) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                'Bot não tem permissão para gerenciar o canal.',
            );
            await intr.editReply({
                content: Config.getLang(
                    'commands.canalprivado_rename.error_messages.no_manage_permission',
                ),
            });
            return;
        }

        const existingChannel = intr.guild.channels.cache.find(
            (ch) =>
                ch.name.toLowerCase() === newName.toLowerCase() &&
                ch.type === ChannelType.GuildVoice,
        );

        if (existingChannel) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                `Já existe um canal com o nome ${newName} no servidor.`,
            );
            await intr.editReply({
                content: Config.getLang(
                    'commands.canalprivado_rename.error_messages.channel_exists_in_server',
                ),
            });
            return;
        }

        const existingChannelQuery = await this.db
            .collection('privateVoiceChannels')
            .where('channelName', '==', newName)
            .get();

        if (!existingChannelQuery.empty) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                `Já existe um canal com o nome ${newName} no Firestore.`,
            );
            await intr.editReply({
                content: Config.getLang(
                    'commands.canalprivado_rename.error_messages.channel_exists_in_firestore',
                ),
            });
            return;
        }

        try {
            Logger.info(
                'CanalPrivadoRenameCommand',
                `Criando novo canal com o nome ${newName}...`,
            );
            const newChannel = await intr.guild.channels.create({
                name: newName,
                type: ChannelType.GuildVoice,
                parent: channel.parentId,
                userLimit: channel.userLimit,
                bitrate: channel.guild.maximumBitrate,
                permissionOverwrites: channel.permissionOverwrites.cache.map(
                    (overwrite) => ({
                        id: overwrite.id,
                        allow: overwrite.allow.toArray(),
                        deny: overwrite.deny.toArray(),
                    }),
                ),
            });

            Logger.info(
                'CanalPrivadoRenameCommand',
                `Novo canal criado com o nome ${newName}.`,
            );

            const members = channel.members;
            const movePromises = members.map((member: GuildMember) =>
                member.voice.setChannel(newChannel),
            );

            await Promise.all(movePromises);
            Logger.info(
                'CanalPrivadoRenameCommand',
                'Todos os membros foram movidos para o novo canal.',
            );

            if (!channel.deletable) {
                await channel.delete();
                Logger.info(
                    'CanalPrivadoRenameCommand',
                    `Canal antigo ${privateChannelName} deletado.`,
                );
            }

            await docRef.update({
                channelName: newChannel.name,
            });

            await intr.editReply({
                content: Config.getLang(
                    'commands.canalprivado_rename.error_messages.channel_rename_success',
                ).replace('{{newName}}', newName),
            });
        } catch (error) {
            void Logger.error(
                'CanalPrivadoRenameCommand',
                `Erro ao tentar alterar o nome do canal: ${String(error)}`,
            );

            await intr.editReply({
                content: Config.getLang(
                    'commands.canalprivado_rename.error_messages.failed_to_create_channel',
                ),
            });
        }
    }
}
