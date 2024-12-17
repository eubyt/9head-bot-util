import { EventHandler } from './EventHandler';
import { CategoryChannel, ChannelType, VoiceState } from 'discord.js';
import { Logger } from '../model/Logger'; // Supondo que o Logger esteja em '../model/Logger'
import { Config } from '../model';

export class AutoVoiceChannel implements EventHandler<'VoiceState'> {
    async execute(oldState: VoiceState, newState: VoiceState) {
        const config = await Config.getConfig(newState.guild.id);
        if (config === undefined) return;

        const channel = newState.channel ?? oldState.channel;
        const { name } = config.AutoVoiceChannel.find(
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
                    void Logger.info(
                        'AutoVoiceChannel',
                        `Tentando deletar o canal vazio: ${deleteChannel.name}`,
                    );

                    emptyChannels = emptyChannels.filter(
                        (x) => x.id !== deleteChannel.id,
                    );
                    await deleteChannel.delete();

                    void Logger.info(
                        'AutoVoiceChannel',
                        `Canal deletado com sucesso: ${deleteChannel.name}`,
                    );
                } catch (e) {
                    void Logger.error(
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
                void Logger.info(
                    'AutoVoiceChannel',
                    `Canais vazios encontrados: ${emptyChannels.map((x) => x.name).join(', ')}`,
                );
                return;
            }

            try {
                void Logger.info(
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

                void Logger.info(
                    'AutoVoiceChannel',
                    `Canal criado com sucesso: ${channelName}`,
                );
            } catch (e) {
                void Logger.error(
                    'AutoVoiceChannel',
                    `Não foi possível criar o canal ${channelName}: ${String(e)}`,
                );
            }
            return;
        }

        void limparCanais();
    }
}
