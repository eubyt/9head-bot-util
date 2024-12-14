import { EventHandler } from './EventHandler';
import { CategoryChannel, ChannelType, VoiceState } from 'discord.js';

export class AutoVoiceChannel implements EventHandler<'VoiceState'> {
    constructor(
        public categoryId: {
            name: string;
            categoryId: string;
        }[],
    ) {}

    async execute(oldState: VoiceState, newState: VoiceState) {
        const channel = newState.channel ?? oldState.channel;
        const { name } = this.categoryId.find(
            (x) => x.categoryId === channel?.parentId,
        ) ?? {
            name: null,
        };

        if (!channel?.parentId) return;
        if (typeof name !== 'string') return;

        const category = channel.client.channels.cache.get(
            channel.parentId,
        ) as CategoryChannel;

        const allVoiceChannels = category.children.cache.filter(
            (x) => x.type === ChannelType.GuildVoice,
        );

        // Lista de canais sem ninguém
        const emptyChannels = allVoiceChannels.filter(
            (x) => x.members.size === 0,
        );

        // Criar canal temp
        if (newState.channel) {
            const channelName = name.replace(
                '{number}',
                (allVoiceChannels.size + 1).toString(),
            );

            if (emptyChannels.size > 0) {
                console.log(
                    'Canais vazios:',
                    emptyChannels.map((x) => x.name),
                );
                return;
            }

            try {
                await channel.guild.channels.create({
                    name: channelName,
                    parent: channel.parentId,
                    type: ChannelType.GuildVoice,
                    userLimit: 10,
                });
            } catch (e) {
                console.log('Não foi possivel criar o canal', channelName);
            }

            return;
        }

        for (const deleteChannel of allVoiceChannels.reverse().values()) {
            if (
                deleteChannel.members.size > 0 ||
                allVoiceChannels.last()?.id === deleteChannel.id
            ) {
                break;
            }

            try {
                await deleteChannel.delete();
            } catch (e) {
                console.log(
                    'Não foi possivel deletar o canal',
                    deleteChannel.name,
                );
            }
        }
    }
}
