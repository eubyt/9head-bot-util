import {
    AttachmentBuilder,
    AuditLogEvent,
    EmbedBuilder,
    GuildBan,
    GuildMember,
    TextChannel,
    ThreadChannel,
} from 'discord.js';

export async function logKickMessage(
    channel: ThreadChannel | TextChannel,
    member: GuildMember,
) {
    const auditLogs = await member.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberKick,
        limit: 1,
    });

    const logEntry = auditLogs.entries.find(
        (entry) => entry.target?.id === member.id,
    );

    if (!logEntry) {
        return;
    }

    const newAvatarUrl = member.user.displayAvatarURL({ size: 1024 });
    const avatarAttachment = new AttachmentBuilder(newAvatarUrl, {
        name: 'avatar.png',
    });

    const embed = new EmbedBuilder()
        .setDescription(`**${member.user.tag} foi expulso**`)
        .setColor(0xff0000)
        .setFooter({
            text: member.user.id,
            iconURL: member.user.displayAvatarURL(),
        })
        .setThumbnail('attachment://avatar.png')
        .addFields({
            name: 'Motivo',
            value: logEntry.reason ?? 'Nenhum motivo fornecido',
        })
        .setTimestamp();

    if (logEntry.executor) {
        embed.addFields({
            name: 'Staff',
            value: `${logEntry.executor.tag} (${logEntry.executor.id})`,
        });
    }

    await channel.send({
        content: `<@${member.user.id}> foi expulso ${logEntry.executor ? `pelo(a) <@${logEntry.executor.id}>` : ''}`,
        embeds: [embed],
        files: [avatarAttachment],
    });
}

export async function LogTimeoutMessage(
    channel: ThreadChannel | TextChannel,
    oldMember: GuildMember,
    newMember: GuildMember,
) {
    // Verifica se o timeout foi adicionado ou removido
    const wasTimedOut = oldMember.communicationDisabledUntil;
    const isTimedOut = newMember.communicationDisabledUntil;

    if (!wasTimedOut && !isTimedOut) {
        return;
    }

    // Punished time invalid
    if (isTimedOut && isTimedOut.getTime() < Date.now()) {
        return;
    }

    const newAvatarUrl = newMember.user.displayAvatarURL({ size: 1024 });
    const avatarAttachment = new AttachmentBuilder(newAvatarUrl, {
        name: 'avatar.png',
    });

    const embed = new EmbedBuilder()
        .setDescription(
            `**${newMember.user.tag} foi ${
                isTimedOut ? 'silenciado' : 'dessilenciado'
            }**`,
        )
        .setColor(isTimedOut ? 0xff0000 : 0xfaa41b)
        .setFooter({
            text: newMember.user.id,
            iconURL: newMember.user.displayAvatarURL(),
        })
        .setThumbnail('attachment://avatar.png')
        .setTimestamp();

    const auditLogs = await newMember.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberUpdate,
        limit: 1,
    });

    const logEntry = auditLogs.entries.find(
        (entry) => entry.target?.id === newMember.id,
    );

    const executor = logEntry?.executor;

    if (isTimedOut) {
        embed.addFields(
            {
                name: 'Tempo de punição',
                value: `<t:${Math.floor(
                    newMember.communicationDisabledUntil.getTime() / 1000,
                ).toString()}:R>`,
                inline: true,
            },
            {
                name: 'Previsão de término',
                value: new Date(
                    newMember.communicationDisabledUntil,
                ).toLocaleString(),
                inline: true,
            },
        );
    } else {
        embed.addFields({
            name: 'Terminou ou terminava em',
            value: new Date(
                oldMember.communicationDisabledUntil ?? new Date(),
            ).toLocaleString(),
        });
    }

    if (executor) {
        embed.addFields({
            name: 'Staff',
            value: `${executor.tag} (${executor.id})`,
        });
    }

    await channel.send({
        content: `<@${newMember.user.id}> foi ${
            isTimedOut ? 'silenciado' : 'dessilenciado'
        } ${executor ? `pelo(a) <@${executor.id}>` : ''}`,
        embeds: [embed],
        files: [avatarAttachment],
    });
}

export async function LogBanMessage(
    channel: ThreadChannel | TextChannel,
    ban: GuildBan,
    banRemove: boolean,
) {
    const newAvatarUrl = ban.user.displayAvatarURL({ size: 1024 });
    const avatarAttachment = new AttachmentBuilder(newAvatarUrl, {
        name: 'avatar.png',
    });

    const auditLogs = await ban.guild.fetchAuditLogs({
        type: banRemove
            ? AuditLogEvent.MemberBanRemove
            : AuditLogEvent.MemberBanAdd,
        limit: 1,
    });

    console.log(banRemove, auditLogs.entries);

    const banLog = auditLogs.entries.find(
        (entry) => entry.target?.id === ban.user.id,
    );

    const reason = banLog?.reason ?? 'Nenhum motivo fornecido';

    const embed = new EmbedBuilder()
        .setDescription(
            `**${ban.user.tag} foi ${banRemove ? 'desbanido' : 'banido'}**`,
        )
        .setThumbnail('attachment://avatar.png')
        .setColor(banRemove ? 0x00ff00 : 0xfaa41b)
        .setFooter({
            text: ban.user.id,
            iconURL: ban.user.displayAvatarURL(),
        })
        .setTimestamp()
        .addFields([
            {
                name: 'Motivo',
                value: reason,
            },
        ]);

    if (banLog?.executor) {
        embed.addFields({
            name: 'Staff',
            value: `${banLog.executor.tag} (${banLog.executor.id})`,
        });
    }

    await channel.send({
        content: `<@${ban.user.id}> foi ${banRemove ? 'desbanido' : 'banido'} ${banLog?.executor ? `pelo(a) <@${banLog.executor.id}>` : ''}`,
        embeds: [embed],
        files: [avatarAttachment],
    });
}
