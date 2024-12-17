import { Message } from 'discord.js';
import { EventHandler } from './EventHandler';

export class FixLinks implements EventHandler<'Message'> {
    async execute(message: Message): Promise<void> {
        if (message.author.bot) return;

        const instagramRegex =
            /https?:\/\/(?:www\.)?instagram\.com\/(p|reels?|tv)\/([\w-]+)(\?\S+)?/i;

        const twitterRegex =
            /https?:\/\/(?:(?:www|m|mobile)\.)?(twitter\.com|x\.com|nitter\.(lucabased\.xyz|poast\.org|privacydev\.net)|xcancel\.com)\/(\w+)\/status\/(\d+)(\/(?:photo|video)\/\d)?\/?(?:\?\S+)?(?:#\S+)?/i;

        // Twitter
        const matchTwitter = message.content.match(twitterRegex);

        if (matchTwitter) {
            const [, , , username, statusId, media] = matchTwitter;
            let correctedLink = `https://fxtwitter.com/${username}/status/${statusId}`;
            if (media) correctedLink += media;

            const markdownLink = `[FxTwitter • ${username}](${correctedLink}/pt)`;

            await message.suppressEmbeds(true);

            await message.reply({
                content: markdownLink,
                allowedMentions: { repliedUser: false },
            });

            return;
        }

        // Instagram,
        const matchInstagram = message.content.match(instagramRegex);

        if (matchInstagram) {
            const newLink = message.content.replace(
                'instagram.com',
                'instagramez.com',
            );
            const markdownLink = `[Instagram](${newLink})`;

            await message.suppressEmbeds(true);
            await message.reply({
                content: markdownLink,
                allowedMentions: { repliedUser: false },
            });

            return;
        }
    }
}
