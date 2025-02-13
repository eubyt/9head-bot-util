import {
    EmbedBuilder,
    AttachmentBuilder,
    User,
    Client,
    PartialUser,
    PermissionFlagsBits,
} from 'discord.js';

export function logUserUpdate(
    oldMember: User | PartialUser,
    newMember: User,
    thread: string,
    client: Client,
) {
    if (newMember.bot) return;

    const embed = new EmbedBuilder()
        .setDescription(`**${newMember.tag} atualizou o perfil**`)
        .setColor(0xfaa41b)
        .setFooter({
            text: newMember.id,
            iconURL: newMember.displayAvatarURL(),
        })
        .setThumbnail('attachment://avatar.png')
        .setTimestamp();

    const sendMessage = () => {
        const newAvatarUrl = newMember.displayAvatarURL({ size: 1024 });
        const avatarAttachment = new AttachmentBuilder(newAvatarUrl, {
            name: 'avatar.png',
        });

        client.guilds.cache.forEach((guild) => {
            guild.channels.cache.forEach((channel) => {
                if (
                    channel.isThread() &&
                    channel.name === thread &&
                    channel.ownerId === client.user?.id
                ) {
                    const thread = channel;
                    const guildMember = guild.members.cache.get(newMember.id);
                    const canViewThread = guildMember
                        ?.permissionsIn(thread)
                        .has(PermissionFlagsBits.ViewChannel);

                    const content = canViewThread
                        ? `@${newMember.displayName}`
                        : `<@${newMember.id}>`;

                    void thread.send({
                        content,
                        embeds: [embed],
                        files: [avatarAttachment],
                        flags: [4096],
                    });
                }
            });
        });
    };

    if (oldMember.displayName !== newMember.displayName) {
        embed.addFields({
            name: 'Displayname',
            value: `${oldMember.displayName} ➔ ${newMember.displayName}`,
        });

        sendMessage();
    } else if (oldMember.username != newMember.username) {
        embed.addFields({
            name: 'Username',
            value: `${oldMember.username ?? 'Nenhum'} ➔ ${newMember.username}`,
        });

        sendMessage();
    } else if (oldMember.avatar !== newMember.avatar) {
        const oldAvatarUrl = oldMember.displayAvatarURL({ size: 1024 });

        embed.addFields(
            {
                name: 'Avatar Anterior',
                value: oldMember.avatar
                    ? `[Clique aqui](${oldAvatarUrl})`
                    : 'Sem avatar',
            },
            {
                name: 'Novo Avatar',
                value: `[Clique aqui](${newMember.displayAvatarURL({ size: 1024 })})`,
            },
        );
        sendMessage();
    }
}
