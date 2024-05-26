import { EventHandler } from './EventHandler';
import {
    ChannelType,
    VoiceState,
    VoiceBasedChannel,
    Guild,
    OverwriteResolvable,
} from 'discord.js';
import { Firestore } from 'firebase-admin/firestore';

interface VoiceChannelData {
    channelName: string;
    permissions: string[];
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
        let channelName = 'invalid';
        const userId = newState.member?.id;

        if (!userId) {
            console.error('User ID not found');
            return;
        }

        if (oldState.channel && oldState.channel.members.size === 0) {
            await oldState.channel.delete();
            console.log('Canal de voz removido com sucesso!');
            return;
        }

        try {
            if (newState.channel && newState.channelId === channelId) {
                const docRef = this.db
                    .collection('privateVoiceChannels')
                    .doc(userId);
                const doc = await docRef.get();

                let allowedUsers: string[] = [];
                if (doc.exists) {
                    const data = doc.data() as VoiceChannelData | undefined;
                    if (data?.permissions) {
                        allowedUsers = data.permissions;
                        channelName = data.channelName;
                    }
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
                    console.log(
                        'Usuário movido para o canal existente com sucesso!',
                    );
                    return;
                }

                const permissionOverwrites = allowedUsers.map((id) => ({
                    id: id,
                    allow: 'ViewChannel',
                })) as OverwriteResolvable[];

                permissionOverwrites.push({
                    id: guild.roles.everyone.id,
                    deny: 'ViewChannel',
                });

                permissionOverwrites.push({
                    id: '1233496853698318448',
                    allow: ['ViewChannel', 'ManageChannels', 'MoveMembers'],
                });

                const newChannel = await guild.channels.create({
                    name: channelName,
                    parent: categoryId,
                    type: ChannelType.GuildVoice,
                    userLimit: 10,
                    permissionOverwrites,
                });

                await newState.member.voice.setChannel(newChannel);
                console.log('Canal de voz criado com sucesso!');
            }
        } catch (error) {
            console.error(
                'Não foi possível mover o usuário ou criar o documento no Firestore.',
                error,
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
