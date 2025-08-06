import {
    Attachment,
    ChannelType,
    Client,
    Collection,
    Embed,
    Message,
    WebhookClient,
} from 'discord.js';
import { EventHandler } from './EventHandler';
import { Config } from '../model';
import { Logger } from '../model/Logger';

export class NineHeadMention implements EventHandler<'Message'> {
    async sendWebHook(
        content: string,
        username: string,
        avatarURL: string,
        channelId: string,
        attachment: Collection<string, Attachment> | null = null,
        embed: Embed[],
    ) {
        const NineHead = Config.getConfigLocal().NineHead;

        const [id, token] = NineHead.webhook.split('/').slice(5);
        const webhookClient = new WebhookClient({ id, token });

        await webhookClient.send({
            content,
            username,
            avatarURL,
            threadId: channelId,
            files: attachment?.map((a) => a),
            embeds: embed,
        });
    }

    async sendMessageRepost(
        message: Message,
        channelId: string,
        client: Client,
        webhookUsername = '',
        webhookAvatarURL = '',
    ) {
        const NineHead = Config.getConfigLocal().NineHead;
        Logger.info('SendMessageRepost', `Start repost ${channelId}`);

        const guild = client.guilds.cache.get(NineHead.nineHeadServer);
        if (!guild) return;

        const channel = await guild.channels.fetch(channelId);
        if (!channel) return;

        if (channel.isTextBased()) {
            Logger.info(
                'SendMessageRepost',
                `ChannelID ${channelId} encontrado.`,
            );

            if (NineHead.webhook) {
                void this.sendWebHook(
                    message.content,
                    webhookUsername,
                    webhookAvatarURL,
                    channelId,
                    message.attachments,
                    message.embeds,
                );
                return;
            }

            void channel.send({
                content: message.content,
                files: message.attachments.map((a) => a),
                embeds: message.embeds,
            });
        }
    }

    async sendMessage(
        message: string,
        attachment: Collection<string, Attachment> | null,
        channelId: string,
        client: Client,
        webhookUsername = '',
        webhookAvatarURL = '',
    ) {
        const NineHead = Config.getConfigLocal().NineHead;

        const guild = client.guilds.cache.get(NineHead.nineHeadServer);
        if (!guild) return;

        const channel = await guild.channels.fetch(channelId);
        if (!channel) return;

        if (channel.isTextBased()) {
            if (NineHead.webhook) {
                void this.sendWebHook(
                    message,
                    webhookUsername,
                    webhookAvatarURL,
                    channelId,
                    attachment,
                    [],
                );
                return;
            }
            void channel.send({
                content: message,
                files: attachment?.map((a) => a),
            });
        }
    }

    execute(message: Message): void {
        const guildId = message.guild?.id;
        const channelId = message.channel.id;
        const NineHead = Config.getConfigLocal().NineHead;

        // Verificar se o canal é um canal de anuncio
        if (
            message.channel.type === ChannelType.GuildAnnouncement &&
            message.guild &&
            message.guild.id === NineHead.nineHeadServer
        ) {
            // Anunciar a mensagem
            void message.crosspost();
            return;
        }

        // Guilda de notificação
        if (guildId !== NineHead.serverMention) return;

        Logger.info('NineHeadMention', 'Mention detected');

        switch (channelId) {
            case NineHead.channelNewsMention.dbdCode: {
                Logger.info('NineHeadMention', 'DBD Code detected');

                const webhookUsername = 'Code | Dead By Daylight';
                const webhookAvatarURL = 'https://i.imgur.com/5o7qJYn.png';

                const fixMention = message.content.replace(
                    '@Code Notification',
                    `<@&${NineHead.pingRole.dbdCodePing}>`,
                );

                void this.sendMessage(
                    fixMention,
                    message.attachments,
                    NineHead.gameChannel.dbd,
                    message.client,

                    webhookUsername,
                    webhookAvatarURL,
                );
                break;
            }
            case NineHead.channelNewsMention.dbdNews: {
                Logger.info('NineHeadMention', 'DBD News detected');
                const messageEdit = message;

                const webhookUsername = 'Dead By Daylight';
                const webhookAvatarURL = 'https://i.imgur.com/byEWgKs.jpeg';

                if (messageEdit.content.includes('Tempo das filas')) {
                    messageEdit.content = `<@&${NineHead.pingRole.dbdTempoFila}> ${messageEdit.content}`;
                }

                if (messageEdit.embeds.length > 0) {
                    if (
                        [
                            'Bug',
                            'Patch',
                            'PTB',
                            'Patch Notes',
                            'Status Report',
                            'Hotfix',
                            'Killswitch',
                        ].some(
                            (e) =>
                                messageEdit.embeds[0].title
                                    ?.toLowerCase()
                                    .includes(e.toLocaleLowerCase()) ??
                                messageEdit.embeds[0].description
                                    ?.toLowerCase()
                                    .includes(e.toLocaleLowerCase()),
                        )
                    ) {
                        messageEdit.content = `<@&${NineHead.pingRole.dbdNewsPing}>`;
                    }
                }

                void this.sendMessageRepost(
                    messageEdit,
                    NineHead.gameChannel.dbd,
                    message.client,

                    webhookUsername,
                    webhookAvatarURL,
                );
                break;
            }
            case NineHead.channelNewsMention.skyblockCalendar: {
                Logger.info('NineHeadMention', 'Calendar detected');

                const embedTitle = message.embeds[0].title;
                const description = `> ${message.embeds[0].description ?? ''}`;

                let webhookUsername = 'Skyblock Time';
                let webhookAvatarURL = 'https://i.imgur.com/WTrzmk1.gif';

                if (embedTitle?.includes('Dark Auction')) {
                    webhookUsername = 'Dark Auction | Skyblock Time';
                    webhookAvatarURL = 'https://i.imgur.com/RuKdJu2.png';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockDarkAuction}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                if (embedTitle?.includes('Hunt')) {
                    webhookUsername = 'Hoppity | Skyblock Time';
                    webhookAvatarURL = 'https://i.imgur.com/9sSA9pM.png';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockHunt}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                if (embedTitle?.includes('Happy New Year Event')) {
                    webhookUsername = 'New Year | Skyblock Time';
                    webhookAvatarURL = 'https://i.imgur.com/OdDtvW0.gif';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockNewYear}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                if (embedTitle?.includes('Jerrys Workshop Event')) {
                    webhookUsername = 'Jerrys Workshop | Skyblock Time';
                    webhookAvatarURL = 'https://i.imgur.com/6Hqh9mt.png';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockSeasonOfJerry}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                if (embedTitle?.includes('Jerrys Workshop Open')) {
                    webhookUsername = 'Jerrys Workshop | Skyblock Time';
                    webhookAvatarURL = 'https://i.imgur.com/6Hqh9mt.png';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockJerryWorkshop}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                if (embedTitle?.includes('Spooky Event')) {
                    webhookUsername = 'Spooky | Skyblock Time';
                    webhookAvatarURL = 'https://i.imgur.com/Q6wh1Np.png';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockSpooky}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                if (embedTitle?.includes('Traveling Zoo')) {
                    webhookUsername = 'Traveling Zoo | Skyblock Time';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockTravellingZoo}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                if (embedTitle?.includes('Mayor Election')) {
                    webhookUsername = 'Mayor Election | Skyblock Time';
                    webhookAvatarURL = 'https://i.imgur.com/BQQyVrV.png';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockElection}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                if (embedTitle?.includes('Fishing Festival')) {
                    webhookUsername = 'Fishing Festival | Skyblock Time';
                    webhookAvatarURL = 'https://i.imgur.com/1y2guS6.gif';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockFestivel}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                if (embedTitle?.includes('Mythological')) {
                    webhookUsername = 'Mythological | Skyblock Time';
                    webhookAvatarURL = 'https://i.imgur.com/W2OC7dQ.gif';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockMythological}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                if (embedTitle?.includes('Mining')) {
                    webhookUsername = 'Mining | Skyblock Time';
                    webhookAvatarURL = 'https://i.imgur.com/VNOy5sz.png';

                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockFiesta}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                void this.sendMessage(
                    description,
                    message.attachments,
                    NineHead.gameChannel.skyblock,
                    message.client,

                    webhookUsername,
                    webhookAvatarURL,
                );

                break;
            }
            case NineHead.channelNewsMention.skyblockChangeVersion: {
                Logger.info(
                    'NineHeadMention',
                    'SkyBlock Change Version detected',
                );

                const webhookUsername = 'Skyblock Version (by Cowshed)';
                const webhookAvatarURL = 'https://i.imgur.com/yYNWd3D.png';

                const messageEdit = message;
                messageEdit.content = '';

                void this.sendMessageRepost(
                    messageEdit,
                    NineHead.gameChannel.skyblock,
                    message.client,

                    webhookUsername,
                    webhookAvatarURL,
                );
                break;
            }

            case NineHead.channelNewsMention.skyblockMiningFiesta: {
                Logger.info(
                    'NineHeadMention',
                    'SkyBlock Mining Fiesta detected',
                );

                const webhookUsername = 'Mining Cult';
                const webhookAvatarURL = 'https://i.imgur.com/VNOy5sz.png';

                if (
                    [
                        'Cole Fiestas',
                        'Jerry Fiestas',
                        'Mining Fiestas',
                        'Foxy Fiesta',
                    ].some((e) =>
                        message.content.toLowerCase().includes(e.toLowerCase()),
                    )
                ) {
                    void this.sendMessage(
                        `<@&${NineHead.pingRole.skyblockFiesta}>\n${message.content}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                }
                break;
            }
            case NineHead.channelNewsMention.skyblockNews: {
                Logger.info('NineHeadMention', 'SkyBlock News detected');

                let webhookUsername = 'SkyBlock News (by Cowshed)';
                let webhookAvatarURL = 'https://i.imgur.com/Bl387ue.jpeg';

                let fixMention = message.content
                    .replace(
                        '@SkyBlock News',
                        `<@&${NineHead.pingRole.skyblockNews}>`,
                    )
                    .replace(
                        '@SkyBlock Status',
                        `<@&${NineHead.pingRole.skyblockNews}>`,
                    )
                    .replace('@SkyBlock Tidbits', '')
                    .replace('@SkyBlock Leaks', '');

                if (message.content.includes('@SkyBlock Fire Sale')) {
                    webhookUsername = 'SkyBlock Fire Sale (by Cowshed)';
                    webhookAvatarURL = 'https://i.imgur.com/AP2j4Gi.gif';

                    fixMention = fixMention.replace(
                        '@SkyBlock Fire Sale',
                        `<@&${NineHead.pingRole.skyblockFireSale}>`,
                    );
                }

                // Check message is embed
                if (message.embeds.length > 0) {
                    const messageEdit = message;
                    messageEdit.content = fixMention;

                    void this.sendMessageRepost(
                        messageEdit,
                        NineHead.gameChannel.skyblock,
                        message.client,

                        webhookUsername,
                        webhookAvatarURL,
                    );
                    return;
                }

                void this.sendMessage(
                    fixMention,
                    message.attachments,
                    NineHead.gameChannel.skyblock,
                    message.client,

                    webhookUsername,
                    webhookAvatarURL,
                );

                break;
            }
        }
    }
}
