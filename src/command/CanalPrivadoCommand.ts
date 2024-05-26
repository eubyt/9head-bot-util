import {
    ChannelType,
    CommandInteraction,
    Guild,
    OverwriteResolvable,
    VoiceChannel,
} from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Firestore } from 'firebase-admin/firestore';

export class CanalPrivadoCommand extends CommandCreator {
    public name = 'canalprivado';
    public name_localizations = null;

    public description = 'Gerencie o seu canal de voz privado.';
    public description_localizations = null;

    public options = [
        {
            type: 3,
            name: 'comando',
            description: 'Selecione a ação que deseja realizar.',
            required: true,
            choices: [
                {
                    name: 'Adicionar pessoa',
                    value: 'add',
                },
                {
                    name: 'Remover pessoa',
                    value: 'remove',
                },
            ],
        },
        {
            type: 6,
            name: 'usuario',
            description: 'Selecione o usuário que deseja adicionar/remover.',
            required: true,
        },
    ];

    constructor(public db: Firestore) {
        super();
    }

    private async update(
        guild: Guild | null,
        channelName: string,
        permissions: string[],
        docRef: FirebaseFirestore.DocumentReference,
    ) {
        if (!guild) return;

        const channel = guild.channels.cache.find(
            (ch) =>
                ch.name === channelName && ch.type === ChannelType.GuildVoice,
        );

        if (!channel) return;

        if (!permissions.includes('1233496853698318448')) {
            permissions.push('1233496853698318448');
        }

        const permissionOverwrites = permissions.map((id) => ({
            id: id,
            allow: ['ViewChannel'],
        })) as OverwriteResolvable[];

        permissionOverwrites.push({
            id: guild.roles.everyone.id,
            deny: ['ViewChannel'],
        });

        permissionOverwrites.push({
            id: '1233496853698318448',
            allow: ['ViewChannel', 'ManageChannels', 'MoveMembers'],
        });

        await (channel as VoiceChannel).permissionOverwrites.set(
            permissionOverwrites,
        );

        await docRef.set({
            channelName: channelName,
            permissions: permissions,
        });
    }

    async execute(intr: CommandInteraction): Promise<void> {
        const subcommand = intr.options.get('comando', true);
        const user = intr.options.get('usuario', true);

        const userId = user.user?.id;

        if (!userId) {
            await intr.reply({ content: 'Usuário inválido.', ephemeral: true });
            return;
        }

        const member = intr.guild?.members.cache.get(userId);

        if (!member || member.user.bot) {
            await intr.reply({
                content: 'Você só pode adicionar ou remover usuários.',
                ephemeral: true,
            });
            return;
        }

        if (intr.user.id === userId) {
            await intr.reply({
                content: 'Você não pode adicionar ou remover a si mesmo.',
                ephemeral: true,
            });
            return;
        }

        const docRef = this.db
            .collection('privateVoiceChannels')
            .doc(intr.user.id);
        const doc = await docRef.get();

        let allowedUsers: string[] = [];
        let privateChannelName = '';

        if (doc.exists) {
            const data = doc.data() as {
                permissions: string[];
                channelName: string;
            };

            allowedUsers = data.permissions;
            privateChannelName = data.channelName;
        } else {
            await intr.reply({
                content: 'Você não tem um canal privado.',
                ephemeral: true,
            });
            return;
        }

        switch (subcommand.value) {
            case 'add':
                if (!allowedUsers.includes(userId)) {
                    allowedUsers.push(userId);
                    await this.update(
                        intr.guild,
                        privateChannelName,
                        allowedUsers,
                        docRef,
                    );

                    await intr.reply({
                        content: `Usuário <@${userId}> adicionado ao canal privado com sucesso!`,
                        ephemeral: true,
                    });
                } else {
                    await intr.reply({
                        content: `Usuário <@${userId}> já está autorizado a acessar o canal privado!`,
                        ephemeral: true,
                    });
                }
                break;
            case 'remove':
                if (allowedUsers.includes(userId)) {
                    allowedUsers = allowedUsers.filter((id) => id !== userId);

                    console.log('Lista após remoção', allowedUsers);

                    await this.update(
                        intr.guild,
                        privateChannelName,
                        allowedUsers,
                        docRef,
                    );

                    await intr.reply({
                        content: `Usuário <@${userId}> removido do canal privado com sucesso!`,
                        ephemeral: true,
                    });
                } else {
                    await intr.reply({
                        content: `Usuário <@${userId}> não está autorizado a acessar o canal privado!`,
                        ephemeral: true,
                    });
                }
                break;
            default:
                await intr.reply({
                    content: 'Comando inválido.',
                    ephemeral: true,
                });
        }
    }
}
