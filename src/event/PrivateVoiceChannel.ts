import { EventHandler } from './EventHandler';
import {
    ChannelType,
    VoiceState,
    VoiceBasedChannel,
    Guild,
    OverwriteResolvable,
} from 'discord.js';
import { Firestore } from 'firebase-admin/firestore';
import { Config } from '../model';
import { Logger } from '../model/Logger'; // Supondo que o Logger esteja em '../model/Logger'

interface VoiceChannelData {
    channelName: string;
    permissions: string[];
    persistente: boolean;
}

export class PrivateVoiceChannel implements EventHandler<'VoiceState'> {
    constructor(
        public categoryId: {
            categoryId: string;
            channelId: string;
        }[],
        public db: Firestore,
    ) {}

    async execute(oldState: VoiceState, newState: VoiceState) {
        const channel = newState.channel ?? oldState.channel;
        if (!channel?.parentId) return;

        const { categoryId, channelId } = this.categoryId.find(
            (x) =>
                x.channelId === channel.id ||
                x.categoryId === oldState.channel?.parentId,
        ) ?? {
            categoryId: null,
        };

        if (typeof categoryId !== 'string') return;

        const guild: Guild = newState.guild;
        let channelName = newState.member?.user.displayName ?? 'invalid';
        const userId = newState.member?.id;

        if (!userId) {
            void Logger.error('PrivateVoiceChannel', 'User ID not found.');
            return;
        }

        // Modificação: A coleção é agora identificada pelo ID do servidor (guild)
        const guildId = guild.id;
        const docRef = this.db
            .collection('guilds')
            .doc(guildId)
            .collection('privateVoiceChannels')
            .doc(userId);
        const doc = await docRef.get();

        if (
            oldState.channel &&
            oldState.channel.members.size === 0 &&
            oldState.channelId !== channelId
        ) {
            if (doc.exists) {
                const data = doc.data() as VoiceChannelData;
                if (data.persistente) {
                    Logger.info(
                        'PrivateVoiceChannel',
                        `O canal de ${userId} é persistente.`,
                    );
                    return;
                }
            }

            try {
                await oldState.channel.delete();
                Logger.info(
                    'PrivateVoiceChannel',
                    `Canal de voz removido com sucesso: ${oldState.channel.name}`,
                );
            } catch (error) {
                void Logger.error(
                    'PrivateVoiceChannel',
                    `Erro ao remover o canal de voz: ${String(error)}`,
                );
            }

            return;
        }

        try {
            if (newState.channel && newState.channelId === channelId) {
                let allowedUsers: string[] = [];
                if (doc.exists) {
                    const data = doc.data() as VoiceChannelData;
                    allowedUsers = data.permissions;
                    channelName = data.channelName;

                    Logger.info(
                        'PrivateVoiceChannel',
                        `Canal encontrado: ${channelName}`,
                    );
                } else {
                    allowedUsers = [userId];
                    await docRef.set({
                        channelName: newState.member.displayName,
                        permissions: allowedUsers,
                    });
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

                const permissionOverwrites = allowedUsers.map((id) => ({
                    id: id,
                    allow: ['ViewChannel', 'Connect'],
                })) as OverwriteResolvable[];

                permissionOverwrites.push({
                    id: guild.roles.everyone.id,
                    allow: ['ViewChannel'],
                    deny: ['Connect'],
                });

                permissionOverwrites.push({
                    id: Config.getConfigLocal().Config_Discord_BOT.id,
                    allow: ['ViewChannel', 'ManageChannels', 'MoveMembers'],
                });

                // Criar o canal de voz
                const newChannel = await guild.channels.create({
                    name: channelName,
                    parent: categoryId,
                    type: ChannelType.GuildVoice,
                    userLimit: 10,
                    permissionOverwrites,
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
                        '</canalprivado:1317440925445787681> para adicionar ou remover pessoas.',
                });
            }
        } catch (error) {
            void Logger.error(
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
