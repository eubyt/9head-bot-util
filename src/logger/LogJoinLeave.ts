import {
    GuildMember,
    ThreadChannel,
    EmbedBuilder,
    AttachmentBuilder,
    Invite,
    Collection,
    Guild,
} from 'discord.js';
import { Logger } from '../model/Logger';

const invitesCache = new Map<string, Collection<string, Invite>>();

function updateInvitesCache(
    guildId: string,
    invites: Collection<string, Invite>,
) {
    invitesCache.set(guildId, invites);
}

export async function logJoinLeave(
    thread: ThreadChannel,
    member: GuildMember,
    join: boolean,
): Promise<void> {
    try {
        const username = member.user.username;
        const authorId = member.id;

        const accountCreationTimestamp = Math.floor(
            member.user.createdAt.getTime() / 1000,
        );
        const currentTimestamp = Math.floor(Date.now() / 1000);

        const avatarURL = member.user.displayAvatarURL({
            size: 1024,
        });
        const avatarAttachment = new AttachmentBuilder(avatarURL, {
            name: 'avatar.png',
        });

        let inviteUsed: Invite | undefined;

        if (join) {
            const cachedInvites = invitesCache.get(member.guild.id);
            const currentInvites = await member.guild.invites.fetch();

            updateInvitesCache(member.guild.id, currentInvites);

            inviteUsed = currentInvites.find(
                (invite) =>
                    cachedInvites?.get(invite.code)?.uses !== invite.uses,
            );

            if (!inviteUsed) {
                inviteUsed = currentInvites.find((invite) => invite.uses === 1);
            }
        }

        const embed = new EmbedBuilder()
            .setColor(join ? 0x00ff00 : 0xff0000)
            .setTitle(
                `${username} ${join ? ', entrou no servidor!' : ', saiu do servidor!'}`,
            )
            .setDescription(
                `**User ID:** ${authorId} (Bot: ${member.user.bot ? 'Sim' : 'Não'})`,
            )
            .setThumbnail('attachment://avatar.png')
            .addFields([
                {
                    name: 'Conta criada em',
                    value: `<t:${accountCreationTimestamp.toString()}:F>`,
                    inline: true,
                },
                {
                    name: join ? 'Ação' : 'Saiu em',
                    value: `<t:${currentTimestamp.toString()}:F>`,

                    inline: true,
                },
            ])
            .setFooter({
                text: member.user.id,
                iconURL: member.user.displayAvatarURL(),
            })
            .setTimestamp();

        if (join && inviteUsed) {
            embed.setFooter({
                text: `Convite usado: ${inviteUsed.code} | Criado por: ${
                    inviteUsed.inviter
                        ? inviteUsed.inviter.username
                        : 'Desconhecido'
                }`,
                iconURL: member.displayAvatarURL(),
            });
        }

        await thread.send({
            content: `<@${authorId}>`,
            embeds: [embed],
            files: [avatarAttachment],
            flags: [4096],
        });
    } catch (error) {
        Logger.error('Server Log', 'Erro em gerar log de entrada/saída.');
    }
}

export async function initializeInviteTracking(guild: Guild) {
    const invites = await guild.invites.fetch();
    updateInvitesCache(guild.id, invites);
}
