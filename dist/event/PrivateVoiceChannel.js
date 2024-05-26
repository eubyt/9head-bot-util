"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateVoiceChannel = void 0;
const discord_js_1 = require("discord.js");
class PrivateVoiceChannel {
    constructor(categoryId, db) {
        this.categoryId = categoryId;
        this.db = db;
    }
    async execute(oldState, newState) {
        const channel = newState.channel ?? oldState.channel;
        if (!channel?.parentId)
            return;
        const { categoryId, channelId } = this.categoryId.find((x) => x.channelId === channel.id ||
            x.categoryId === oldState.channel?.parentId) ?? {
            categoryId: null,
        };
        if (typeof categoryId !== 'string')
            return;
        const guild = newState.guild;
        let channelName = 'invalid';
        const userId = newState.member?.id;
        if (!userId) {
            console.error('User ID not found');
            return;
        }
        if (oldState.channel && oldState.channel.members.size === 0) {
            await oldState.channel.delete();
            console.log('Canal de voz removido com sucesso!');
            return;
        }
        try {
            if (newState.channel && newState.channelId === channelId) {
                const docRef = this.db
                    .collection('privateVoiceChannels')
                    .doc(userId);
                const doc = await docRef.get();
                let allowedUsers = [];
                if (doc.exists) {
                    const data = doc.data();
                    if (data?.permissions) {
                        allowedUsers = data.permissions;
                        channelName = data.channelName;
                    }
                }
                else {
                    allowedUsers = [userId];
                    await docRef.set({
                        channelName: newState.member.displayName,
                        permissions: allowedUsers,
                    });
                }
                const existingChannel = this.findExistingChannel(guild, categoryId, channelName);
                if (existingChannel) {
                    await newState.member.voice.setChannel(existingChannel);
                    console.log('Usuário movido para o canal existente com sucesso!');
                    return;
                }
                const permissionOverwrites = allowedUsers.map((id) => ({
                    id: id,
                    allow: 'ViewChannel',
                }));
                permissionOverwrites.push({
                    id: guild.roles.everyone.id,
                    deny: 'ViewChannel',
                });
                permissionOverwrites.push({
                    id: '1233496853698318448',
                    allow: ['ViewChannel', 'ManageChannels', 'MoveMembers'],
                });
                const newChannel = await guild.channels.create({
                    name: channelName,
                    parent: categoryId,
                    type: discord_js_1.ChannelType.GuildVoice,
                    userLimit: 10,
                    permissionOverwrites,
                });
                await newState.member.voice.setChannel(newChannel);
                console.log('Canal de voz criado com sucesso!');
            }
        }
        catch (error) {
            console.error('Não foi possível mover o usuário ou criar o documento no Firestore.', error);
        }
    }
    findExistingChannel(guild, categoryId, channelName) {
        return guild.channels.cache.find((ch) => ch.type === discord_js_1.ChannelType.GuildVoice &&
            ch.parentId === categoryId &&
            ch.name.toLowerCase() === channelName.toLowerCase());
    }
}
exports.PrivateVoiceChannel = PrivateVoiceChannel;
//# sourceMappingURL=PrivateVoiceChannel.js.map