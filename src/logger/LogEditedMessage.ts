import {
    ThreadChannel,
    Message,
    PartialMessage,
    PermissionFlagsBits,
} from 'discord.js';
import { Logger } from '../model/Logger';
import { sendLogMessage } from './ServerLogger';

export async function logEditedMessage(
    thread: ThreadChannel,
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
    partial: boolean,
): Promise<void> {
    try {
        const oldContent = oldMessage.content ?? 'Conteúdo desconhecido';
        const newContent = newMessage.content ?? 'Conteúdo desconhecido';
        const author = oldMessage.author?.tag ?? 'Autor desconhecido';
        const authorId = oldMessage.author?.id ?? 'ID desconhecido';

        const guildMember = thread.guild.members.cache.get(authorId);
        const canViewThread = guildMember
            ? thread
                  .permissionsFor(guildMember)
                  .has(PermissionFlagsBits.ViewChannel)
            : false;

        let channelName = 'Canal desconhecido';
        let channelId = 'ID desconhecido';
        if ('name' in oldMessage.channel) {
            channelName = oldMessage.channel.name;
            channelId = oldMessage.channel.id;
        }

        const timestamp = oldMessage.createdTimestamp
            ? new Date(oldMessage.createdTimestamp).toISOString()
            : 'Data desconhecida';

        const header = `• **[EDITADO]** | Canal: <#${channelId}> | Autor: ${
            canViewThread ? author : `<@${authorId}>`
        } | Editado há: <t:${Math.floor(Date.now() / 1000).toString()}:R>`;

        const details = `\`\`\`diff
- Data/Hora:   ${timestamp}
- Autor:       ${author} (ID: ${authorId})
- Canal:       #${channelName} (ID: ${channelId})
- Mensagem ID: ${oldMessage.id}
\`\`\``;

        if (oldContent == newContent && !partial) {
            return;
        }

        await sendLogMessage('', thread, header, details);

        if (!partial) {
            await sendLogMessage(
                oldContent,
                thread,
                '',
                '```diff\n- [ANTIGO]```',
            );
        }

        await sendLogMessage(newContent, thread, '', '```diff\n+ [NOVO]```');
    } catch (error: unknown) {
        Logger.error(
            'Server Log',
            `Erro ao enviar log para a thread: ${String(error)}`,
        );
    }
}
