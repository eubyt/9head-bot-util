import {
    AuditLogEvent,
    Message,
    PartialMessage,
    ThreadChannel,
} from 'discord.js';
import { Logger } from '../model/Logger';
import { sendLogMessage } from './ServerLogger';

export async function logDeletedMessage(
    thread: ThreadChannel,
    message: Message | PartialMessage,
): Promise<void> {
    try {
        const content = message.content ?? '[Mensagem sem conteúdo]';
        const author = message.author?.tag ?? 'Autor desconhecido';
        const authorId = message.author?.id ?? 'ID desconhecido';

        let channelName = 'Canal desconhecido';
        let channelId = 'ID desconhecido';
        if ('name' in message.channel) {
            channelName = message.channel.name;
            channelId = message.channel.id;
        }

        const timestamp = message.createdTimestamp
            ? new Date(message.createdTimestamp).toISOString()
            : 'Data desconhecida';

        let deleter = undefined;
        try {
            const auditLogs = await thread.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MessageDelete,
            });
            const logEntry = auditLogs.entries.first();

            if (
                logEntry &&
                logEntry.target.id === message.author?.id &&
                logEntry.extra.channel.id === message.channel.id
            ) {
                if (logEntry.executor) {
                    deleter = `${logEntry.executor.tag} (ID: ${logEntry.executor.id}, Bot: ${logEntry.executor.bot ? 'Sim' : 'Não'})`;
                }
            }
        } catch {
            void Logger.error(
                'Server Log',
                'Erro ao buscar logs de auditoria.',
            );
        }

        const header = `[DELETE_LOG] | Canal: <#${channelId}> | Autor: <@${authorId}> | Deletada há: <t:${Math.floor(Date.now() / 1000).toString()}:R>`;

        const details = `\`\`\`diff
- Data/Hora:   ${timestamp}
- Autor:       ${author} (ID: ${authorId})
- Canal:       #${channelName} (ID: ${channelId})
- Mensagem ID: ${message.id}
${deleter ? `+ Deletada por: ${deleter}\n` : ''}
\`\`\``;

        if (message.partial) {
            await sendLogMessage(
                '',
                thread,
                `[DELETED MESSAGE] Canal: <#${channelId}>`,
                `\`\`\`diff
- Mensagem ID: ${message.id}
- Não é possivel recuperar informações da mensagem.
\`\`\``,
            );
        } else {
            await sendLogMessage(content, thread, header, details);
        }

        if (message.attachments.size > 0) {
            await thread.send({
                content: `\`\`\`Mensagem contém anexos: ${String(message.attachments.size)}\`\`\``,
                files: message.attachments.map((attachment) => attachment.url),
            });
        }
    } catch (error: unknown) {
        void Logger.error(
            'Server Log',
            `Erro ao enviar log para a thread: ${String(error)}`,
        );
    }
}
