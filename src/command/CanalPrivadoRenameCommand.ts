import {
    CommandInteraction,
    ChannelType,
    VoiceChannel,
    GuildMember,
} from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Firestore } from 'firebase-admin/firestore';

export class CanalPrivadoRenameCommand extends CommandCreator {
    public name = 'canalprivado-rename';
    public name_localizations = null;

    public description =
        '「Canal Privado」 Trocar o nome do seu canal privado.';
    public description_localizations = null;

    public options = [
        {
            type: 3,
            name: 'nome',
            description: 'Digite o nome do seu canal',
            required: true,
        },
    ];

    constructor(public db: Firestore) {
        super();
    }

    async execute(intr: CommandInteraction) {
        // Inicia o deferReply para informar ao Discord que a interação está sendo processada
        await intr.deferReply({ ephemeral: true });

        const newName = intr.options.get('nome', true).value as string;
        console.log(`Novo nome recebido: ${newName}`);

        // Verifica se o nome do canal tem mais de 32 caracteres
        if (newName.length > 32) {
            console.log('Nome do canal excedeu o limite de 32 caracteres.');
            await intr.editReply({
                content: 'O nome do canal não pode exceder 32 caracteres.',
            });
            return;
        }

        const docRef = this.db
            .collection('privateVoiceChannels')
            .doc(intr.user.id);
        const doc = await docRef.get();

        // Verifica se o usuário tem um canal privado
        if (!doc.exists) {
            console.log('Usuário não tem um canal privado no Firestore.');
            await intr.editReply({
                content: 'Você não tem um canal privado.',
            });
            return;
        }

        const data = doc.data() as {
            channelName: string;
            permissions: string[];
        };
        const privateChannelName = data.channelName;
        console.log(
            `Nome do canal privado no Firestore: ${privateChannelName}`,
        );

        // Encontra o canal original no servidor
        const channel = intr.guild?.channels.cache.find(
            (ch) =>
                ch.name === privateChannelName &&
                ch.type === ChannelType.GuildVoice,
        ) as VoiceChannel | undefined;

        // Verifica se o canal foi encontrado
        if (!channel) {
            console.log(
                `Não consegui encontrar o canal ${privateChannelName} no servidor.`,
            );
            await intr.editReply({
                content:
                    'Não consegui encontrar o seu canal privado. Certifique-se de estar no canal correto.',
            });
            return;
        }

        const botMember = intr.guild?.members.me;
        // Verifica se o bot tem permissão para gerenciar o canal
        if (
            !botMember ||
            !channel.permissionsFor(botMember).has('ManageChannels')
        ) {
            console.log('Bot não tem permissão para gerenciar o canal.');
            await intr.editReply({
                content:
                    'Eu não tenho permissão para alterar o nome do canal. Por favor, verifique minhas permissões.',
            });
            return;
        }

        // Verifica se já existe um canal com o mesmo nome no servidor ou no Firestore
        const existingChannel = intr.guild.channels.cache.find(
            (ch) =>
                ch.name.toLowerCase() === newName.toLowerCase() &&
                ch.type === ChannelType.GuildVoice,
        );

        if (existingChannel) {
            console.log(
                `Já existe um canal com o nome ${newName} no servidor.`,
            );
            await intr.editReply({
                content:
                    'Já existe um canal com este nome no servidor. Escolha um nome diferente.',
            });
            return;
        }

        const existingChannelQuery = await this.db
            .collection('privateVoiceChannels')
            .where('channelName', '==', newName)
            .get();

        if (!existingChannelQuery.empty) {
            console.log(
                `Já existe um canal com o nome ${newName} no Firestore.`,
            );
            await intr.editReply({
                content:
                    'Já existe um canal com este nome. Escolha um nome diferente.',
            });
            return;
        }

        try {
            // Cria o novo canal com o novo nome
            console.log(`Criando novo canal com o nome ${newName}...`);
            const newChannel = await intr.guild.channels.create({
                name: newName,
                type: ChannelType.GuildVoice,
                parent: channel.parentId, // Manter a mesma categoria
                userLimit: channel.userLimit,
                bitrate: channel.guild.maximumBitrate,
                permissionOverwrites: channel.permissionOverwrites.cache.map(
                    (overwrite) => ({
                        id: overwrite.id,
                        allow: overwrite.allow.toArray(),
                        deny: overwrite.deny.toArray(),
                    }),
                ), // Copiar permissões do canal original
            });

            console.log(`Novo canal criado com o nome ${newName}.`);

            // Move todos os membros para o novo canal
            const members = channel.members;
            const movePromises = members.map((member: GuildMember) =>
                member.voice.setChannel(newChannel),
            );

            await Promise.all(movePromises); // Aguarda todas as promessas
            console.log('Todos os membros foram movidos para o novo canal.');

            // Exclui o canal antigo
            await channel.delete();
            console.log(`Canal antigo ${privateChannelName} deletado.`);

            // Atualiza o nome do canal no Firestore
            await docRef.update({
                channelName: newChannel.name,
            });

            await intr.editReply({
                content: `O nome do canal foi alterado para  \`${newName}\`. O canal antigo foi deletado.`,
            });
        } catch (error) {
            console.error('Erro ao tentar alterar o nome do canal:', error);

            await intr.editReply({
                content:
                    'Não foi possível alterar o nome do canal. Tente novamente mais tarde.',
            });
        }
    }
}
