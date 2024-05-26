"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoVoiceChannel = void 0;
const discord_js_1 = require("discord.js");
class AutoVoiceChannel {
    constructor(categoryId) {
        this.categoryId = categoryId;
    }
    async execute(oldState, newState) {
        const channel = newState.channel ?? oldState.channel;
        const { name } = this.categoryId.find((x) => x.id === channel?.parentId) ?? {
            name: null,
        };
        if (!channel?.parentId)
            return;
        if (typeof name !== 'string')
            return;
        const category = channel.client.channels.cache.get(channel.parentId);
        const allVoiceChannels = category.children.cache.filter((x) => x.type === discord_js_1.ChannelType.GuildVoice);
        // Lista de canais sem ninguém
        const emptyChannels = allVoiceChannels.filter((x) => x.members.size === 0);
        // Criar canal temp
        if (newState.channel) {
            const channelName = name.replace('{number}', (allVoiceChannels.size + 1).toString());
            if (emptyChannels.size > 0) {
                console.log('Canais vazios:', emptyChannels.map((x) => x.name));
                return;
            }
            try {
                await channel.guild.channels.create({
                    name: channelName,
                    parent: channel.parentId,
                    type: discord_js_1.ChannelType.GuildVoice,
                    userLimit: 10,
                });
            }
            catch (e) {
                console.log('Não foi possivel criar o canal', channelName);
            }
            return;
        }
        for (const deleteChannel of allVoiceChannels.reverse().values()) {
            if (deleteChannel.members.size > 0 ||
                allVoiceChannels.last()?.id === deleteChannel.id) {
                break;
            }
            try {
                await deleteChannel.delete();
            }
            catch (e) {
                console.log('Não foi possivel deletar o canal', deleteChannel.name);
            }
        }
    }
}
exports.AutoVoiceChannel = AutoVoiceChannel;
//# sourceMappingURL=AutoVoiceChannel.js.map