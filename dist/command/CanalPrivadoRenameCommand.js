"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanalPrivadoRenameCommand = void 0;
const discord_js_1 = require("discord.js");
const CommandBot_1 = require("./CommandBot");
class CanalPrivadoRenameCommand extends CommandBot_1.CommandCreator {
    constructor(db) {
        super();
        this.db = db;
        this.name = 'canalprivado-rename';
        this.name_localizations = null;
        this.description = 'Trocar o nome do seu canal privado.';
        this.description_localizations = null;
        this.options = [
            {
                type: 3,
                name: 'nome',
                description: 'Digite o nome do seu canal',
                required: true,
            },
        ];
    }
    async execute(intr) {
        const newName = intr.options.get('nome', true).value;
        if (newName.length > 12) {
            await intr.reply({
                content: 'O nome do canal não pode exceder 12 caracteres.',
                ephemeral: true,
            });
            return;
        }
        const docRef = this.db
            .collection('privateVoiceChannels')
            .doc(intr.user.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            await intr.reply({
                content: 'Você não tem um canal privado.',
                ephemeral: true,
            });
            return;
        }
        const data = doc.data();
        const privateChannelName = data.channelName;
        const channel = intr.guild?.channels.cache.find((ch) => ch.name === privateChannelName &&
            ch.type === discord_js_1.ChannelType.GuildVoice);
        // Verificar se já existe um canal com o mesmo nome no Firestore
        const existingChannelQuery = await this.db
            .collection('privateVoiceChannels')
            .where('channelName', '==', newName)
            .get();
        if (!existingChannelQuery.empty) {
            await intr.reply({
                content: 'Já existe um canal com este nome. Escolha um nome diferente.',
                ephemeral: true,
            });
            return;
        }
        try {
            if (channel) {
                await channel.setName(newName);
            }
            // Atualizar o nome do canal no Firestore
            await docRef.update({
                channelName: newName,
            });
            await intr.reply({
                content: `O nome do canal foi alterado para "${newName}".`,
                ephemeral: true,
            });
        }
        catch (error) {
            await intr.reply({
                content: 'Não foi possível alterar o nome do canal.',
                ephemeral: true,
            });
            console.error('Erro ao alterar o nome do canal:', error);
        }
    }
}
exports.CanalPrivadoRenameCommand = CanalPrivadoRenameCommand;
//# sourceMappingURL=CanalPrivadoRenameCommand.js.map