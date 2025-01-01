import {
    GuildMember,
    ThreadChannel,
    EmbedBuilder,
    AttachmentBuilder,
} from 'discord.js';

export async function logMemberUpdate(
    thread: ThreadChannel,
    oldMember: GuildMember,
    newMember: GuildMember,
) {
    const newAvatarUrl = newMember.user.displayAvatarURL({ size: 1024 });
    const avatarAttachment = new AttachmentBuilder(newAvatarUrl, {
        name: 'avatar.png',
    });

    const sendMessage = async () => {
        await thread.send({
            content: `<@${newMember.id}>`,
            embeds: [embed],
            files: [avatarAttachment],
        });
    };

    const embed = new EmbedBuilder()
        .setDescription(
            `**${newMember.user.tag} atualizou o perfil no servidor**`,
        )
        .setColor(0xfaa41b)
        .setFooter({
            text: newMember.user.id,
            iconURL: newMember.user.displayAvatarURL(),
        })
        .setThumbnail('attachment://avatar.png')
        .setTimestamp()
        .addFields({
            name: 'Informações do Usuário',
            value: `<t:${Math.floor(newMember.user.createdTimestamp / 1000).toString()}:F>`,
            inline: true,
        });

    if (newMember.joinedTimestamp) {
        embed.addFields({
            name: 'Tempo no servidor',
            value: `<t:${Math.floor(newMember.joinedTimestamp / 1000).toString()}:R>`,
            inline: true,
        });
    }

    if (oldMember.user.avatar !== newMember.user.avatar) {
        const oldAvatarUrl = oldMember.user.displayAvatarURL({ size: 1024 });

        embed.addFields(
            {
                name: 'Avatar Anterior',
                value: oldMember.user.avatar
                    ? `[Clique aqui](${oldAvatarUrl})`
                    : 'Sem avatar',
            },
            {
                name: 'Novo Avatar',
                value: `[Clique aqui](${newAvatarUrl})`,
            },
        );

        await sendMessage();
        return;
    }

    if (oldMember.nickname !== newMember.nickname) {
        embed.addFields({
            name: 'Nickname',
            value: `${oldMember.nickname ?? newMember.user.displayName} ➔ ${newMember.nickname ?? newMember.user.displayName}`,
        });

        await sendMessage();
        return;
    }

    if (oldMember.user.username !== newMember.user.username) {
        embed.addFields({
            name: 'Username',
            value: `${oldMember.user.username} ➔ ${newMember.user.username}`,
            inline: true,
        });

        await sendMessage();
        return;
    }

    const addedRoles = newMember.roles.cache.filter(
        (role) => !oldMember.roles.cache.has(role.id),
    );
    const removedRoles = oldMember.roles.cache.filter(
        (role) => !newMember.roles.cache.has(role.id),
    );

    if (addedRoles.size > 0 || removedRoles.size > 0) {
        if (addedRoles.size > 0) {
            embed.addFields({
                name: 'Cargos Adicionados',
                value: addedRoles.map((r) => `*${r.name}*`).join(', '),
            });
        }

        if (removedRoles.size > 0) {
            embed.addFields({
                name: 'Cargos Removidos',
                value: removedRoles.map((r) => `*${r.name}*`).join(', '),
            });
        }

        await sendMessage();
    }
}
