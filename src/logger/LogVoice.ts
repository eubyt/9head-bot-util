import {
    AttachmentBuilder,
    AuditLogEvent,
    EmbedBuilder,
    ThreadChannel,
    VoiceState,
} from 'discord.js';

export async function logVoice(
    thread: ThreadChannel,
    oldState: VoiceState,
    newState: VoiceState,
) {
    const user = newState.member?.user ?? oldState.member?.user;
    if (!user) return;

    const newAvatarUrl = user.displayAvatarURL({ size: 1024 });
    const avatarAttachment = new AttachmentBuilder(newAvatarUrl, {
        name: 'avatar.png',
    });

    const sendMessage = async () => {
        await thread.send({
            content: `<@${user.id}>`,
            embeds: [embed],
            files: [avatarAttachment],
            flags: [4096],
        });
    };

    const embed = new EmbedBuilder()
        .setFooter({
            text: user.id,
            iconURL: user.displayAvatarURL(),
        })
        .setColor(0x3498db)
        .setThumbnail('attachment://avatar.png')
        .setTimestamp();

    if (!oldState.channel && newState.channel) {
        embed
            .setDescription(`**${user.tag} entrou no canal de voz**`)
            .addFields({
                name: 'Canal',
                value: newState.channel.name,
                inline: true,
            })
            .addFields({
                name: 'ID',
                value: newState.channel.id,
                inline: true,
            });

        void sendMessage();
    } else if (oldState.channel && !newState.channel) {
        embed
            .setDescription(`**${user.tag} saiu do canal de voz**`)
            .addFields({
                name: 'Canal',
                value: oldState.channel.name,
                inline: true,
            })
            .addFields({
                name: 'ID',
                value: oldState.channel.id,
                inline: true,
            });

        void sendMessage();
    } else if (
        oldState.channel &&
        newState.channel &&
        oldState.channel.id !== newState.channelId
    ) {
        embed
            .setDescription(`**${user.tag} mudou de canal de voz**`)
            .addFields({
                name: 'Canal Anterior',
                value: `${oldState.channel.name} (ID: ${oldState.channel.id})`,
            })
            .addFields({
                name: 'Canal Novo',
                value: ` ${newState.channel.name} (ID: ${newState.channel.id})`,
            });

        void sendMessage();
    }

    if (newState.selfMute) {
        embed
            .setDescription(`**${user.tag} se mutou**`)
            .addFields({
                name: 'Canal',
                value: newState.channel ? newState.channel.name : 'Nenhum',
                inline: true,
            })
            .addFields({
                name: 'ID',
                value: newState.channel ? newState.channel.id : 'Nenhum',
                inline: true,
            });

        void sendMessage();
    }

    if (newState.serverMute) {
        const auditLogs = await thread.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberUpdate,
        });

        const muteLog = auditLogs.entries.find(
            (entry) =>
                entry.target?.id === newState.member?.id &&
                entry.changes.some(
                    (change) => change.key === 'mute' && change.new === true,
                ),
        );

        console.log(auditLogs.entries.first()?.changes);

        embed
            .setDescription(`**${user.tag} foi mutado pelo servidor**`)
            .addFields({
                name: 'Canal',
                value: newState.channel ? newState.channel.name : 'Nenhum',
                inline: true,
            })
            .addFields({
                name: 'ID',
                value: newState.channel ? newState.channel.id : 'Nenhum',
                inline: true,
            });

        if (muteLog?.executor) {
            embed.addFields({
                name: 'Responsável',
                value: `**${muteLog.executor.tag}** (ID: ${muteLog.executor.id})`,
            });
        } else {
            embed.addFields({
                name: 'Responsável',
                value: 'Não foi possível determinar.',
            });
        }

        void sendMessage();
    }

    if (newState.serverDeaf) {
        const auditLogs = await thread.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberUpdate,
        });

        const muteLog = auditLogs.entries.find(
            (entry) =>
                entry.target?.id === newState.member?.id &&
                entry.changes.some(
                    (change) => change.key === 'deaf' && change.new === true,
                ),
        );

        embed
            .setDescription(
                `**${user.tag} está com o áudio desativado pelo servidor**`,
            )
            .addFields({
                name: 'Canal',
                value: newState.channel ? newState.channel.name : 'Nenhum',
                inline: true,
            })
            .addFields({
                name: 'ID',
                value: newState.channel ? newState.channel.id : 'Nenhum',
                inline: true,
            });

        if (muteLog?.executor) {
            embed.addFields({
                name: 'Responsável',
                value: `**${muteLog.executor.tag}** (ID: ${muteLog.executor.id})`,
            });
        } else {
            embed.addFields({
                name: 'Responsável',
                value: 'Não foi possível determinar.',
            });
        }

        void sendMessage();
    }
}
