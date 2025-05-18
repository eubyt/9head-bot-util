import { EventHandler } from './EventHandler';
import { CategoryChannel, ChannelType, VoiceState } from 'discord.js';
import { Logger } from '../model/Logger';
import { Config } from '../model';

export class AutoVoiceChannel implements EventHandler<'VoiceState'> {
    async execute(oldState: VoiceState, newState: VoiceState) {
        const config = await Config.getConfig(newState.guild.id);
        if (config === undefined) return;

        let channel = newState.channel ?? oldState.channel;
        let channelParentId = channel?.parentId;

        if (
            newState.channel &&
            oldState.channel &&
            newState.channel.parentId !== oldState.channel.parentId
        ) {
            channelParentId = oldState.channel.parentId;
            channel = oldState.channel;
        }

        const { name } = config.AutoVoiceChannel.find(
            (x) => x.categoryId === channelParentId,
        ) ?? {
            name: null,
        };

        console.log(
            'AutoVoiceChannel',
            oldState.channel?.name,
            newState.channel?.name,
        );

        if (!channel?.parentId) return;
        if (typeof name !== 'string') {
            Logger.info(
                'AutoVoiceChannel',
                `Nenhum canal encontrado para a categoria ${channel.parentId}`,
            );
            return;
        }

        const category = channel.client.channels.cache.get(
            channel.parentId,
        ) as CategoryChannel;

        const allVoiceChannels = category.children.cache.filter(
            (x) => x.type === ChannelType.GuildVoice,
        );

        // Rename all channels
        for (const [index, voiceChannel] of Array.from(
            allVoiceChannels.values(),
        ).entries()) {
            const newName = name.replace(
                '{number}',
                (Number(index) + 1).toString(),
            );

            if (voiceChannel.name === newName) continue;

            try {
                Logger.info(
                    'AutoVoiceChannel',
                    `Renomeando canal: ${voiceChannel.name} -> ${newName}`,
                );

                await voiceChannel.setName(newName);

                Logger.info(
                    'AutoVoiceChannel',
                    `Canal renomeado com sucesso: ${voiceChannel.name} -> ${newName}`,
                );
            } catch (e) {
                Logger.error(
                    'AutoVoiceChannel',
                    `Não foi possível renomear o canal ${voiceChannel.name}: ${String(e)}`,
                );
            }
        }

        // Lista de canais sem ninguém
        let emptyChannels = allVoiceChannels.filter(
            (x) => x.members.size === 0,
        );

        const limparCanais = async () => {
            for (const deleteChannel of allVoiceChannels.reverse().values()) {
                if (
                    deleteChannel.members.size > 0 ||
                    allVoiceChannels.last()?.id === deleteChannel.id ||
                    emptyChannels.size <= 1
                ) {
                    break;
                }

                try {
                    Logger.info(
                        'AutoVoiceChannel',
                        `Tentando deletar o canal vazio: ${deleteChannel.name}`,
                    );

                    emptyChannels = emptyChannels.filter(
                        (x) => x.id !== deleteChannel.id,
                    );

                    if (deleteChannel.name === name.replace('{number}', '1'))
                        return;

                    await deleteChannel.delete();

                    Logger.info(
                        'AutoVoiceChannel',
                        `Canal deletado com sucesso: ${deleteChannel.name}`,
                    );
                } catch (e) {
                    Logger.error(
                        'AutoVoiceChannel',
                        `Não foi possível deletar o canal ${deleteChannel.name}: ${String(e)}`,
                    );
                }
            }
        };

        // Criar canal temp
        if (newState.channel) {
            const channelName = name.replace(
                '{number}',
                (allVoiceChannels.size + 1).toString(),
            );

            if (emptyChannels.size > 0) {
                Logger.info(
                    'AutoVoiceChannel',
                    `Canais vazios encontrados: ${emptyChannels.map((x) => x.name).join(', ')}`,
                );

                if (emptyChannels.size > 1) void limparCanais();
                return;
            }

            try {
                Logger.info(
                    'AutoVoiceChannel',
                    `Criando novo canal: ${channelName}`,
                );

                await channel.guild.channels.create({
                    name: channelName,
                    parent: channel.parentId,
                    type: ChannelType.GuildVoice,
                    userLimit: 10,
                    bitrate: channel.guild.maximumBitrate,
                });

                Logger.info(
                    'AutoVoiceChannel',
                    `Canal criado com sucesso: ${channelName}`,
                );
            } catch (e) {
                Logger.error(
                    'AutoVoiceChannel',
                    `Não foi possível criar o canal ${channelName}: ${String(e)}`,
                );
            }
            return;
        }

        void limparCanais();
    }
}
