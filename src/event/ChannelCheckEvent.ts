import { Message, TextChannel } from 'discord.js';
import { EventHandler } from './EventHandler';
import { Config } from '../model';
import { Logger } from '../model/Logger';
import { channel } from 'diagnostics_channel';

export class ChannelCheckEvent implements EventHandler<'Message'> {
    async execute(message: Message): Promise<void> {
        if (message.author.bot || !message.guildId) return;

        const config = await Config.getConfig(message.guildId);
        if (!config || !message.guildId) return;

        if (
            config.FmBotChannel !== message.channelId &&
            config.CommandChannel === message.channelId
        ) {
            const forbiddenCommandsRegex = /\.(f|gw|r|c|u)(\s?.*)?/;

            if (forbiddenCommandsRegex.test(message.content)) {
                try {
                    await message.react('❌');

                    const warningMessage = await (
                        message.channel as TextChannel
                    ).send({
                        content: Config.getLang(
                            'channelEvent.warn_channel_fmbot',
                        ).replace('{{channel}}', `<#${config.FmBotChannel}>`),
                        reply: { messageReference: message.id },
                    });

                    setTimeout(() => {
                        warningMessage.delete().catch(() => {
                            void Logger.error(
                                'ChannelCheckEvent',
                                'Erro ao deletar mensagem de aviso',
                            );
                        });

                        message.delete().catch(() => {
                            void Logger.error(
                                'ChannelCheckEvent',
                                'Erro ao deletar mensagem de comando proibido',
                            );
                        });
                    }, 5000);
                } catch (error) {
                    console.error('Erro ao processar a mensagem:', error);
                }
            }

            return;
        }

        // Channel counter
        if (
            config.CounterChannel === message.channelId &&
            message.channel instanceof TextChannel
        ) {
            const counterCurrent = config.CounterChannelAmount || 0;
            let warnMessage = undefined;

            // Check Message is a number
            if (isNaN(Number(message.content))) {
                warnMessage = await message.channel.send({
                    content: Config.getLang(
                        'channelEvent.counter_number_invalid',
                    ),
                    reply: { messageReference: message.id },
                });
            }

            // Verificar a mensagem
            const nextNumber = Number(message.content) + 1;
            if (nextNumber !== counterCurrent + 1 && !warnMessage) {
                warnMessage = await message.channel.send({
                    content: Config.getLang(
                        'channelEvent.counter_next_number',
                    ).replace('{{nextNumber}}', String(counterCurrent + 1)),
                    reply: { messageReference: message.id },
                });
            }

            if (warnMessage) {
                setTimeout(() => {
                    message.delete().catch(() => {
                        void Logger.error(
                            'Counter Channel',
                            'Erro ao deletar a mensagem de número errado',
                        );
                    });

                    warnMessage.delete().catch(() => {
                        void Logger.error(
                            'Counter Channel',
                            'Erro ao deletar a mensagem de aviso',
                        );
                    });
                }, 5000);
                return;
            }

            const db = Config.getGuildCollection(message.guildId);
            await db.update({
                CounterChannelAmount: nextNumber,
            });

            Config.configCache.delete(message.guildId);

            // Verificar se o canal tem webhook
            const webhooks = await message.channel.fetchWebhooks();

            // Procurar um webhook existente ou criar um novo
            let webhook = webhooks.find((wh) => wh.name === 'ContadorBot');
            if (!webhook) {
                webhook = await message.channel.createWebhook({
                    name: 'ContadorBot',
                    avatar: message.author.displayAvatarURL(),
                });
            }

            // Apagar a mensagem do usuário
            await message.delete();

            // Reenviar a mensagem usando o webhook
            await webhook.send({
                content: message.content,
                username: message.member?.displayName ?? 'Usuário',
                avatarURL: message.author.displayAvatarURL(),
            });

            return;
        }
    }
}
