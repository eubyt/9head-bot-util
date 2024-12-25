import { ThreadChannel, Message, PartialMessage } from 'discord.js';
import { Logger } from '../model/Logger';
import { sendLogMessage } from './ServerLogger';

export async function logEditedMessage(
    thread: ThreadChannel,
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
): Promise<void> {
    try {
        if (oldMessage.partial || newMessage.partial) {
            oldMessage = await oldMessage.fetch();
            newMessage = await newMessage.fetch();
        }

        const oldContent = oldMessage.content;
        const newContent = newMessage.content;
        const author = oldMessage.author.tag;
        const authorId = oldMessage.author.id;

        let channelName = 'Canal desconhecido';
        let channelId = 'ID desconhecido';
        if ('name' in oldMessage.channel) {
            channelName = oldMessage.channel.name;
            channelId = oldMessage.channel.id;
        }

        const timestamp = oldMessage.createdTimestamp
            ? new Date(oldMessage.createdTimestamp).toISOString()
            : 'Data desconhecida';

        const header = `[EDIT_LOG] | Canal: <#${channelId}> | Autor: <@${authorId}>`;

        const details = `\`\`\`diff
- Data/Hora:   ${timestamp}
- Autor:       ${author} (ID: ${authorId})
- Canal:       #${channelName} (ID: ${channelId})
- Mensagem ID: ${oldMessage.id}
\`\`\``;

        if (oldContent === newContent) {
            return;
        }

        await sendLogMessage('', thread, header, details);
        await sendLogMessage(
            newContent,
            thread,
            '',
            '```diff\n+ [Antigo] ' + oldContent + '\n```',
        );
        await sendLogMessage(
            newContent,
            thread,
            '',
            '```diff\n+ [Novo] ' + newContent + '\n```',
        );
    } catch (error: unknown) {
        void Logger.error(
            'Server Log',
            `Erro ao enviar log para a thread: ${String(error)}`,
        );
    }
}
