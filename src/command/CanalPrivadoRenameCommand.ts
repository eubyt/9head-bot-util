import {
    CommandInteraction,
    ChannelType,
    VoiceChannel,
    GuildMember,
} from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Config } from '../model';
import { Logger } from '../model/Logger';

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

    /**
     * Função para verificar se o nome do canal excede o limite de caracteres.
     */
    private isValidChannelName(name: string): boolean {
        return name.length <= 32;
    }

    /**
     * Função para verificar se o bot tem permissão para gerenciar o canal.
     */
    private hasManageChannelsPermission(
        channel: VoiceChannel,
        botMember: GuildMember,
    ): boolean {
        return channel.permissionsFor(botMember).has('ManageChannels');
    }

    /**
     * Função para obter o documento do canal privado no Firestore.
     */
    private async getPrivateChannelDoc(
        db: FirebaseFirestore.DocumentReference,
        userId: string,
    ) {
        const docRef = db.collection('privateVoiceChannels').doc(userId);
        const doc = await docRef.get();
        return doc.exists ? doc.data() : null;
    }

    /**
     * Função principal que executa o comando de renomear o canal privado.
     */
    async execute(intr: CommandInteraction): Promise<void> {
        const newName = intr.options.get('nome', true).value as string;
        const userId = intr.user.id;

        await intr.deferReply({ ephemeral: true });

        void Logger.info(
            'CanalPrivadoRenameCommand',
            `Novo nome recebido: ${newName}`,
        );

        // Verifica se o nome do canal é válido
        if (!this.isValidChannelName(newName)) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                'Nome do canal excedeu o limite de 32 caracteres.',
            );

            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_rename.error_messages.channel_name_too_long',
                ),
                userId,
            );
            return;
        }

        const guildId = intr.guildId;
        if (!intr.guild || !guildId) {
            await intr.editReply({
                content: 'Guild ID não encontrado.',
            });
            return;
        }

        const db = Config.getGuildCollection(guildId);
        const privateChannelDoc = await this.getPrivateChannelDoc(
            db,
            intr.user.id,
        );

        if (!privateChannelDoc) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                `Usuário ${intr.user.id} não tem um canal privado.`,
            );

            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_rename.error_messages.no_private_channel',
                ),
                userId,
            );
            return;
        }

        const privateChannelName = privateChannelDoc.channelName as string;
        void Logger.info(
            'CanalPrivadoRenameCommand',
            `Nome do canal privado no Firestore: ${privateChannelName}`,
        );

        // Verifica se o canal privado existe no servidor
        const channel = intr.guild.channels.cache.find(
            (ch) =>
                ch.name === privateChannelName &&
                ch.type === ChannelType.GuildVoice,
        ) as VoiceChannel | undefined;

        if (!channel) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                `Canal ${privateChannelName} não encontrado no servidor.`,
            );

            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_rename.error_messages.channel_not_found',
                ),
                userId,
            );
            return;
        }

        const botMember = intr.guild.members.me;
        if (
            !botMember ||
            !this.hasManageChannelsPermission(channel, botMember)
        ) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                'Bot não tem permissão para gerenciar o canal.',
            );
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_rename.error_messages.no_manage_permission',
                ),
                userId,
            );
            return;
        }

        // Verifica se já existe um canal com o novo nome no servidor
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

            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_rename.error_messages.channel_exists_in_server',
                ),
                userId,
            );
            return;
        }

        // Verifica se já existe um canal com o novo nome no Firestore
        const existingChannelQuery = await db
            .collection('privateVoiceChannels')
            .where('channelName', '==', newName)
            .get();

        if (!existingChannelQuery.empty) {
            void Logger.warn(
                'CanalPrivadoRenameCommand',
                `Já existe um canal com o nome ${newName} no Firestore.`,
            );
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_rename.error_messages.channel_exists_in_firestore',
                ),
                userId,
            );
            return;
        }

        try {
            void Logger.info(
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

            void Logger.info(
                'CanalPrivadoRenameCommand',
                `Novo canal criado com o nome ${newName}.`,
            );

            // Move os membros para o novo canal
            const movePromises = channel.members.map((member: GuildMember) =>
                member.voice.setChannel(newChannel),
            );
            await Promise.all(movePromises);
            void Logger.info(
                'CanalPrivadoRenameCommand',
                'Todos os membros foram movidos para o novo canal.',
            );

            // Deleta o canal antigo, se possível
            if (channel.deletable) {
                await channel.delete();
                void Logger.info(
                    'CanalPrivadoRenameCommand',
                    `Canal antigo ${privateChannelName} deletado.`,
                );
            }

            // Atualiza o nome do canal no Firestore
            await db
                .collection('privateVoiceChannels')
                .doc(intr.user.id)
                .update({ channelName: newChannel.name });

            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.success_messages.sucess_title',
                ),
                Config.getLang(
                    'commands.canalprivado_rename.success_messages.channel_rename_success',
                ).replace('{{newName}}', newName),
                userId,
            );
        } catch (error) {
            void Logger.error(
                'CanalPrivadoRenameCommand',
                `Erro ao tentar alterar o nome do canal: ${String(error)}`,
            );

            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.canalprivado_rename.error_messages.failed_to_create_channel',
                ),
                userId,
            );
        }
    }
}
