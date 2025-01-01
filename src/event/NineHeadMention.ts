import { Attachment, Client, Collection, Message } from 'discord.js';
import { EventHandler } from './EventHandler';
import { Config } from '../model';
import { Logger } from '../model/Logger';

export class NineHeadMention implements EventHandler<'Message'> {
    sendMessageRepost(message: Message, channelId: string, client: Client) {
        const NineHead = Config.getConfigLocal().NineHead;

        const guild = client.guilds.cache.get(NineHead.nineHeadServer);
        if (!guild) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        if (channel.isTextBased()) {
            void channel.send({
                content: message.content,
                files: message.attachments.map((a) => a),
                embeds: message.embeds,
            });
        }
    }

    sendMessage(
        message: string,
        attachment: Collection<string, Attachment> | null,
        channelId: string,
        client: Client,
    ) {
        const NineHead = Config.getConfigLocal().NineHead;

        const guild = client.guilds.cache.get(NineHead.nineHeadServer);
        if (!guild) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        if (channel.isTextBased()) {
            void channel.send({
                content: message,
                files: attachment?.map((a) => a),
            });
        }
    }

    execute(message: Message): void {
        if (!message.author.bot) return;

        const guildId = message.guild?.id;
        const channelId = message.channel.id;
        const NineHead = Config.getConfigLocal().NineHead;

        // Guilda de notificação
        if (guildId !== NineHead.serverMention) return;

        Logger.info('NineHeadMention', 'Mention detected');

        switch (channelId) {
            case NineHead.channelNewsMention.dbdCode: {
                Logger.info('NineHeadMention', 'DBD Code detected');

                const fixMention = message.content.replace(
                    '@Code Notification',
                    `<@${NineHead.pingRole.dbdCodePing}>`,
                );

                this.sendMessage(
                    fixMention,
                    message.attachments,
                    NineHead.gameChannel.dbd,
                    message.client,
                );
                break;
            }
            case NineHead.channelNewsMention.dbdNews: {
                Logger.info('NineHeadMention', 'DBD News detected');
                const messageEdit = message;

                if (messageEdit.embeds.length > 0) {
                    if (
                        [
                            'Bug',
                            'Patch',
                            'Patch Notes',
                            'Hotfix',
                            'Killswitch',
                        ].some((e) =>
                            messageEdit.embeds[0].title
                                ?.toLowerCase()
                                .includes(e.toLocaleLowerCase()),
                        )
                    ) {
                        messageEdit.content = `<@&${NineHead.pingRole.dbdNewsPing}>`;
                    }
                }

                this.sendMessageRepost(
                    messageEdit,
                    NineHead.gameChannel.dbd,
                    message.client,
                );
                this.sendMessage(
                    '```diff\n- Mensagem do servidor DBDLeaks```',
                    null,
                    NineHead.gameChannel.dbd,
                    message.client,
                );
                break;
            }
            case NineHead.channelNewsMention.skyblockCalendar: {
                Logger.info('NineHeadMention', 'Calendar detected');

                console.log(message.embeds[0].title);
                const embedTitle = message.embeds[0].title;
                const description = message.embeds[0].description;

                if (description === null) return;

                if (embedTitle?.includes('Dark Auction')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockDarkAuction}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Hunt')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockHunt}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Happy New Year Event')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockNewYear}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Jerrys Workshop Event')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockSeasonOfJerry}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Jerrys Workshop Open')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockJerryWorkshop}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Spooky Event')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockSpooky}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Traveling Zoo')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockTravellingZoo}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Mayor Election')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockElection}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Fishing Festival')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockFestivel}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Fishing Festival')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockFestivel}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Mythological')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockMythological}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                if (embedTitle?.includes('Mining')) {
                    this.sendMessage(
                        `<@${NineHead.pingRole.skyblockFiesta}>\n${description}`,
                        message.attachments,
                        NineHead.gameChannel.skyblock,
                        message.client,
                    );
                    return;
                }

                this.sendMessage(
                    description,
                    message.attachments,
                    NineHead.gameChannel.skyblock,
                    message.client,
                );

                break;
            }
            case NineHead.channelNewsMention.skyblockChangeVersion:
                Logger.info(
                    'NineHeadMention',
                    'SkyBlock Change Version detected',
                );
                this.sendMessageRepost(
                    message,
                    NineHead.gameChannel.skyblock,
                    message.client,
                );
                break;

            case NineHead.channelNewsMention.skyblockNews: {
                Logger.info('NineHeadMention', 'SkyBlock News detected');
                const fixMention = message.content
                    .replace(
                        '@SkyBlock News',
                        `<@${NineHead.pingRole.skyblockNews}>`,
                    )
                    .replace(
                        '@SkyBlock Status',
                        `<@${NineHead.pingRole.skyblockNews}>`,
                    )
                    .replace(
                        '@SkyBlock Fire Sale',
                        `<@${NineHead.pingRole.skyblockFireSale}>`,
                    )
                    .replace('@SkyBlock Tidbits', '')
                    .replace('@SkyBlock Leaks', '');

                this.sendMessage(
                    fixMention + '```diff\n- Mensagem do servidor Cowshed\n```',
                    message.attachments,
                    NineHead.gameChannel.skyblock,
                    message.client,
                );

                break;
            }
        }
    }
}
