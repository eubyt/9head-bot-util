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
            const roleId = config.CounterChannelRule;
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
            if (
                Number(message.content) !== counterCurrent + 1 &&
                !warnMessage
            ) {
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
                CounterChannelAmount: counterCurrent + 1,
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

            // Adicionar o cargo ao membro atual
            // Loading members with the role

            const role = message.channel.guild.roles.cache.get(roleId);
            if (!role) {
                void Logger.error('Counter Channel', 'Cargo não encontrado');
                return;
            }

            const membersWithRole = role.members;
            for (const [, member] of membersWithRole) {
                await member.roles.remove(roleId).catch(() => {
                    void Logger.error(
                        'Counter Channel',
                        'Erro ao remover cargo:',
                    );
                });
            }

            // Adicionar o cargo ao membro atual
            await message.member?.roles.add(roleId).catch(() => {
                void Logger.error('Counter Channel', 'Erro ao adicionar cargo');
            });

            return;
        }
    }
}
