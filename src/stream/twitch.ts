import { RefreshingAuthProvider } from '@twurple/auth';
import { ConfigData } from '../model/Config';
import { APIEmbed, EmbedBuilder, WebhookClient } from 'discord.js';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { ChatClient } from '@twurple/chat';

async function webhookMessage(
    config: ConfigData,
    content: string,
    username: string,
    embeds: APIEmbed[],
) {
    const [id, token] = config.NineHead.webhookStreamMod.split('/').slice(5);

    const webhookClient = new WebhookClient({ id, token });

    await webhookClient.send({
        content,
        username: username,
        avatarURL: 'https://i.imgur.com/jzdN56Y.png',
        embeds: embeds,
    });
}

export async function startTwitchBot(config: ConfigData) {
    let tokenData = {
        accessToken: 'Invalid',
        refreshToken: config.twitch.identity.refreshToken,
        expiresIn: 0,
        obtainmentTimestamp: 0,
    };

    const authProvider = new RefreshingAuthProvider({
        clientId: config.twitch.identity.clientId,
        clientSecret: config.twitch.identity.clientSecret,
    });

    authProvider.onRefresh((_, newTokenData) => {
        tokenData = {
            ...newTokenData,
            expiresIn: newTokenData.expiresIn ?? 0,
            refreshToken: newTokenData.refreshToken ?? '',
        };
    });

    await authProvider.addUserForToken(tokenData, ['chat']);

    const apiClient = new ApiClient({ authProvider });

    // Conectar ao EventSub
    const listener = new EventSubWsListener({ apiClient });
    listener.start();

    // Conectar ao Chat
    const chatClient = new ChatClient({
        authProvider,
        channels: config.twitch.channels,
    });
    chatClient.connect();

    chatClient.onMessageRemove((channel, messageId, msg) => {
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Mensagem Removida')
            .setColor(0xff0000)
            .addFields(
                {
                    name: '📺 Canal',
                    value: `${channel} (ID: ${msg.channelId})`,
                },
                {
                    name: '👤 Usuário',
                    value: msg.userName,
                },
                {
                    name: '💬 Mensagem ID',
                    value: `\`${messageId}\``,
                },
            )
            .setTimestamp(new Date())
            .setFooter({
                text: `Mensagem removida em ${channel}`,
            });

        void webhookMessage(config, '', 'Mensagem Removida', [embed.toJSON()]);
    });

    void (async () => {
        for (const channel of config.twitch.channels) {
            const streamer = await apiClient.users.getUserByName(channel);

            if (streamer) {
                listener.onChannelBan(streamer, (event) => {
                    const IsPermanentBan = !event.endDate;
                    const embed = new EmbedBuilder()
                        .setTitle(
                            IsPermanentBan
                                ? '🚫 Banimento Permanente'
                                : '🚫 Banimento Temporário',
                        )
                        .setColor(IsPermanentBan ? 0xff0000 : 0xffff00)
                        .addFields(
                            {
                                name: '👤 Usuário',
                                value: `${event.userDisplayName} (ID: ${event.userId})`,
                                inline: true,
                            },
                            {
                                name: '🔨 Moderador',
                                value: `${event.moderatorDisplayName} (ID: ${event.moderatorId})`,
                                inline: true,
                            },
                            {
                                name: '📺 Canal',
                                value: `${streamer.displayName} (ID: ${streamer.id})`,
                            },
                            {
                                name: '📝 Motivo',
                                value:
                                    event.reason.trim() ||
                                    'Nenhum motivo informado.',
                            },
                        )
                        .setTimestamp(new Date())
                        .setFooter({
                            text: `Ban detectado em ${streamer.displayName}`,
                        });

                    if (!IsPermanentBan) {
                        embed.addFields({
                            name: '⏳ Duração',
                            value: `<t:${Math.floor(event.endDate.getTime() / 1000).toString()}>`,
                        });
                    }

                    void webhookMessage(config, '', 'Punição', [
                        embed.toJSON(),
                    ]);
                });

                listener.onChannelUnban(streamer, (event) => {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Desbanimento')
                        .setColor(0x00cc66)
                        .addFields(
                            {
                                name: '👤 Usuário',
                                value: `${event.userDisplayName} (ID: ${event.userId})`,
                                inline: true,
                            },
                            {
                                name: '🔓 Moderador',
                                value: `${event.moderatorDisplayName} (ID: ${event.moderatorId})`,
                                inline: true,
                            },
                            {
                                name: '📺 Canal',
                                value: `${streamer.displayName} (ID: ${streamer.id})`,
                            },
                        )
                        .setTimestamp(new Date())
                        .setFooter({
                            text: `Desbanimento em ${streamer.displayName}`,
                        });

                    void webhookMessage(config, '', 'Punição', [
                        embed.toJSON(),
                    ]);
                });

                // New mod
                listener.onChannelModeratorAdd(streamer, (event) => {
                    const embed = new EmbedBuilder()
                        .setTitle('👮 Novo Moderador')
                        .setColor(0x00cc66)
                        .addFields(
                            {
                                name: '👤 Moderador',
                                value: `${event.userDisplayName} (ID: ${event.userId})`,
                            },
                            {
                                name: '📺 Canal',
                                value: `${streamer.displayName} (ID: ${streamer.id})`,
                            },
                        )
                        .setTimestamp(new Date())
                        .setFooter({
                            text: `Novo moderador em ${streamer.displayName}`,
                        });

                    void webhookMessage(config, '', 'Moderador', [
                        embed.toJSON(),
                    ]);
                });

                // Removed mod
                listener.onChannelModeratorRemove(streamer, (event) => {
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Moderador Removido')
                        .setColor(0xff0000)
                        .addFields(
                            {
                                name: '👤 Moderador',
                                value: `${event.userDisplayName} (ID: ${event.userId})`,
                            },
                            {
                                name: '📺 Canal',
                                value: `${streamer.displayName} (ID: ${streamer.id})`,
                            },
                        )
                        .setTimestamp(new Date())
                        .setFooter({
                            text: `Moderador removido de ${streamer.displayName}`,
                        });

                    void webhookMessage(config, '', 'Moderador', [
                        embed.toJSON(),
                    ]);
                });

                // New VIP
                listener.onChannelVipAdd(streamer, (event) => {
                    const embed = new EmbedBuilder()
                        .setTitle('🌟 Novo VIP')
                        .setColor(0x00cc66)
                        .addFields(
                            {
                                name: '👤 VIP',
                                value: `${event.userDisplayName} (ID: ${event.userId})`,
                            },
                            {
                                name: '📺 Canal',
                                value: `${streamer.displayName} (ID: ${streamer.id})`,
                            },
                        )
                        .setTimestamp(new Date())
                        .setFooter({
                            text: `Novo VIP em ${streamer.displayName}`,
                        });

                    void webhookMessage(config, '', 'VIP', [embed.toJSON()]);
                });

                // Removed VIP
                listener.onChannelVipRemove(streamer, (event) => {
                    const embed = new EmbedBuilder()
                        .setTitle('❌ VIP Removido')
                        .setColor(0xff0000)
                        .addFields(
                            {
                                name: '👤 VIP',
                                value: `${event.userDisplayName} (ID: ${event.userId})`,
                            },
                            {
                                name: '📺 Canal',
                                value: `${streamer.displayName} (ID: ${streamer.id})`,
                            },
                        )
                        .setTimestamp(new Date())
                        .setFooter({
                            text: `VIP removido de ${streamer.displayName}`,
                        });

                    void webhookMessage(config, '', 'VIP', [embed.toJSON()]);
                });
            } else {
                console.warn(`Streamer ID not found for channel: ${channel}`);
            }
        }
    })();
}
