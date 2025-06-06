import { EventHandler } from './EventHandler';
import {
    ChannelType,
    VoiceState,
    VoiceBasedChannel,
    Guild,
    OverwriteResolvable,
    PermissionResolvable,
} from 'discord.js';
import { Config } from '../model';
import { Logger } from '../model/Logger';

interface VoiceChannelData {
    channelName: string;
    permissions: string[];
    persistente: boolean;
    hidden: boolean;
}

export function buildPrivateChannelPermissions(
    guild: Guild,
    allowedUsers: string[],
    hidden = false,
): OverwriteResolvable[] {
    const botId = Config.getConfigLocal().Config_Discord_BOT.id;

    return [
        // Permissões para os usuários permitidos
        ...allowedUsers.map((id) => ({
            id,
            allow: ['ViewChannel', 'Connect'] as PermissionResolvable[],
        })),

        // Permissões padrão (everyone)
        {
            id: guild.roles.everyone.id,
            allow: hidden ? [] : (['ViewChannel'] as PermissionResolvable[]),
            deny: hidden
                ? (['ViewChannel', 'Connect'] as PermissionResolvable[])
                : (['SendMessages', 'Connect'] as PermissionResolvable[]),
        },

        // Permissões do bot
        {
            id: botId,
            allow: [
                'ViewChannel',
                'ManageChannels',
                'MoveMembers',
                'Connect',
            ] as PermissionResolvable[],
        },

        // Permissões para moderadores com BanMembers
        ...guild.roles.cache
            .filter((role) => role.permissions.has('BanMembers'))
            .map((role) => ({
                id: role.id,
                allow: [
                    'ViewChannel',
                    'ManageChannels',
                    'MoveMembers',
                    'MuteMembers',
                    'DeafenMembers',
                    'SendMessages',
                    'Connect',
                ] as PermissionResolvable[],
            })),
    ];
}

export class PrivateVoiceChannel implements EventHandler<'VoiceState'> {
    async execute(oldState: VoiceState, newState: VoiceState) {
        const config = await Config.getConfig(newState.guild.id);
        if (config === undefined) return;

        const channel = newState.channel ?? oldState.channel;
        if (!channel?.parentId) return;

        const { categoryId, channelId } = config.PrivateVoiceChannel.find(
            (x) =>
                x.channelId === channel.id ||
                x.categoryId === oldState.channel?.parentId,
        ) ?? {
            categoryId: null,
        };

        if (typeof categoryId !== 'string') return;

        const guild: Guild = newState.guild;
        let channelName = newState.channel?.name ?? 'invalid';
        const userId = newState.member?.id;

        if (!userId) {
            Logger.error('PrivateVoiceChannel', 'User ID not found.');
            return;
        }

        // Modificação: A coleção é agora identificada pelo ID do servidor (guild)
        const docRef = Config.getGuildCollection(guild.id)
            .collection('privateVoiceChannels')
            .where('channelName', '==', channelName)
            .limit(1);
        const doc = await docRef.get();

        console.log('PrivateVoiceChannel', {
            private: {
                channelId,
                categoryId,
            },
            channelName,
        });

        if (
            oldState.channel &&
            oldState.channel.members.size === 0 &&
            oldState.channel.parentId === categoryId &&
            oldState.channelId !== channelId
        ) {
            console.log('Deletar PrivateChannel', {
                channelId,
                currentChannel: oldState.channelId,
                nameChannel: oldState.channel.name,
                igual: oldState.channelId === channelId,
            });
            if (!doc.empty) {
                const data = doc.docs[0].data() as VoiceChannelData;
                if (data.persistente) {
                    Logger.info(
                        'PrivateVoiceChannel',
                        `O canal de ${userId} é persistente.`,
                    );
                    return;
                }
            }

            try {
                Logger.info(
                    'PrivateVoiceChannel',
                    `Canal de voz removido com sucesso: ${oldState.channel.name}`,
                );
                await oldState.channel.delete();
            } catch (error) {
                Logger.error(
                    'PrivateVoiceChannel',
                    `Erro ao remover o canal de voz: ${String(error)}`,
                );
            }

            return;
        }

        try {
            if (newState.channel && newState.channelId !== channelId) {
                console.log('PrivateVoiceChannel', 'Canal de espera...');
                let allowedUsers: string[] = [];
                let hidden = false;
                if (!doc.empty) {
                    const data = doc.docs[0].data() as VoiceChannelData;
                    allowedUsers = data.permissions;
                    channelName = data.channelName;
                    hidden = data.hidden;

                    Logger.info(
                        'PrivateVoiceChannel',
                        `Canal encontrado: ${channelName}`,
                    );
                } else {
                    allowedUsers = [userId];
                    channelName = newState.member.displayName;

                    await Config.getGuildCollection(guild.id)
                        .collection('privateVoiceChannels')
                        .doc(userId)
                        .set({
                            channelName,
                            permissions: allowedUsers,
                            persistente: false,
                            hidden: false,
                        });
                    console.log(
                        `Canal privado criado para o usuário ${userId}: ${channelName}`,
                    );
                }

                const existingChannel = this.findExistingChannel(
                    guild,
                    categoryId,
                    channelName,
                );

                if (existingChannel) {
                    await newState.member.voice.setChannel(existingChannel);
                    Logger.info(
                        'PrivateVoiceChannel',
                        `Usuário ${userId} movido para o canal existente: ${existingChannel.name}`,
                    );
                    return;
                }

                for (const userId of allowedUsers) {
                    const user = await guild.members
                        .fetch(userId)
                        .catch(() => null);

                    if (!user) {
                        Logger.warn(
                            'PrivateVoiceChannel',
                            `Usuário com ID ${userId} não encontrado no servidor.`,
                        );
                        allowedUsers = allowedUsers.filter((x) => x !== userId);
                    }
                }

                // Criar o canal de voz
                const newChannel = await guild.channels.create({
                    name: channelName,
                    parent: categoryId,
                    type: ChannelType.GuildVoice,
                    userLimit: 10,
                    permissionOverwrites: buildPrivateChannelPermissions(
                        guild,
                        allowedUsers,
                        hidden,
                    ),
                    bitrate: channel.guild.maximumBitrate,
                });

                await newState.member.voice.setChannel(newChannel);
                Logger.info(
                    'PrivateVoiceChannel',
                    `Canal de voz criado com sucesso: ${newChannel.name}`,
                );

                // Enviar a mensagem explicativa no canal de texto
                await newChannel.send({
                    content:
                        'Bem-vindo ao seu canal privado! Use os seguintes comandos:\n\n' +
                        '</canalprivado-rename:1317440925445787682> para renomear o canal.\n' +
                        '</canalprivado:1317440925445787681> para adicionar ou remover pessoas.\n' +
                        '</canalprivado-persistencia:1317440925445787680> para tornar o canal persistente (Nunca ser deletado).\n' +
                        '</canalprivado-ocultar:1317440925445787683> para ocultar o canal.\n' +
                        '\n' +
                        '<@' +
                        userId +
                        '> ',
                });
            }
        } catch (error) {
            Logger.error(
                'PrivateVoiceChannel',
                `Erro ao mover o usuário ou criar o documento no Firestore: ${String(error)}`,
            );
        }
    }

    private findExistingChannel(
        guild: Guild,
        categoryId: string,
        channelName: string,
    ): VoiceBasedChannel | null {
        return guild.channels.cache.find(
            (ch) =>
                ch.type === ChannelType.GuildVoice &&
                ch.parentId === categoryId &&
                ch.name.toLowerCase() === channelName.toLowerCase(),
        ) as VoiceBasedChannel | null;
    }
}
