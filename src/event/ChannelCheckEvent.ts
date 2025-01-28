import { Message, TextChannel } from 'discord.js';
import { EventHandler } from './EventHandler';
import { Config } from '../model';
import { Logger } from '../model/Logger';

export class ChannelCheckEvent implements EventHandler<'Message'> {
    private async deleteMessage(message: Message, warningMessage?: Message) {
        await message.react('🗑️');
        setTimeout(() => {
            [message, warningMessage].forEach((msg) => {
                if (msg) {
                    msg.delete().catch(() => {
                        Logger.error(
                            'ChannelCheckEvent',
                            'Erro ao deletar mensagem do canal',
                        );
                    });
                }
            });
        }, 5000);
    }

    async execute(message: Message): Promise<void> {
        const fmRegexCommand = /\.(f|gw|r|c|u|judge)(\s?.*)?/;
        const chatCommand = message.content.split(' ')[0];

        if (message.author.bot || !message.guildId) return;

        const config = await Config.getConfig(message.guildId);
        if (!config || !message.guildId) return;

        if (
            config.NivelChannel === message.channelId ||
            config.FishingChannel === message.channelId
        ) {
            void this.deleteMessage(message);
            return;
        }

        // Apenas comandos de FMbot são permitidos
        if (config.FmBotChannel === message.channelId) {
            if (!fmRegexCommand.test(chatCommand)) {
                void this.deleteMessage(message);
                return;
            }
        }

        // Avisar o canal do FMbot
        if (
            config.FmBotChannel !== message.channelId &&
            config.CommandChannel === message.channelId
        ) {
            if (fmRegexCommand.test(chatCommand)) {
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
                            Logger.error(
                                'ChannelCheckEvent',
                                'Erro ao deletar mensagem de aviso',
                            );
                        });

                        message.delete().catch(() => {
                            Logger.error(
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
            const role = message.channel.guild.roles.cache.get(roleId);

            if (!role) {
                Logger.error('Counter Channel', 'Cargo não encontrado');
                return;
            }

            if (
                message.member?.roles.cache.some((role) => role.id === roleId)
            ) {
                warnMessage = await message.channel.send({
                    content: Config.getLang('channelEvent.counter_same_person'),
                    reply: { messageReference: message.id },
                });
            }

            // Verificar se a pessoa já possui o role

            if (isNaN(Number(message.content))) {
                warnMessage = await message.channel.send({
                    content: Config.getLang(
                        'channelEvent.counter_number_invalid',
                    ),
                    reply: { messageReference: message.id },
                });
            }

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
                void this.deleteMessage(message, warnMessage);
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
                avatarURL: message.author.avatarURL() ?? undefined,
            });

            // Adicionar o cargo ao membro atual
            // Loading members with the role

            const membersWithRole = role.members;
            for (const [, member] of membersWithRole) {
                await member.roles.remove(roleId).catch(() => {
                    Logger.error('Counter Channel', 'Erro ao remover cargo:');
                });
            }

            // Adicionar o cargo ao membro atual
            await message.member?.roles.add(roleId).catch(() => {
                Logger.error('Counter Channel', 'Erro ao adicionar cargo');
            });

            return;
        }
    }
}
