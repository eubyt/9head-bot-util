import { config as dotenvConfig } from 'dotenv'; // Importar o dotenv
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { CommandHandle } from './event/CommandHandle';
import { CommandCreator, PingCommand } from './command';
import { Config, DiscordBot } from './model';
import { AutoVoiceChannel } from './event/AutoVoiceChannel';
import { PrivateVoiceChannel } from './event/PrivateVoiceChannel';
import { ServiceAccount, initializeApp } from 'firebase-admin/app';
import { credential, firestore } from 'firebase-admin';
import { CanalPrivadoCommand } from './command/CanalPrivadoCommand';
import { CanalPrivadoRenameCommand } from './command/CanalPrivadoRenameCommand';
import { CanalPrivadoPersistenciaCommand } from './command/CanalPrivadoPersistenciaCommand';

// Carregar variáveis de ambiente do arquivo .env
dotenvConfig();

async function start(): Promise<void> {
    new Config(); // Loading Config

    if (!process.env.FIREBASE_ADMIN) {
        throw new Error('Firebase key admin invalid');
    }

    initializeApp({
        credential: credential.cert(
            JSON.parse(process.env.FIREBASE_ADMIN) as ServiceAccount,
        ),
    });

    const db = firestore();

    /// Discord bot \/

    // Criar os Eventos
    const commandHandle = new CommandHandle([
        new PingCommand(),
        new CanalPrivadoCommand(db),
        new CanalPrivadoRenameCommand(db),
        new CanalPrivadoPersistenciaCommand(db),
    ]);

    // AutoVoiceChannel
    const autoVoiceChannel = new AutoVoiceChannel(
        Config.getConfig().AutoVoiceChannel,
    );

    const privateVoiceChannel = new PrivateVoiceChannel(
        Config.getConfig().PrivateVoiceChannel,
        db,
    );

    const bot = new DiscordBot({
        commandHandle,
        autoVoiceChannel,
        privateVoiceChannel,
        client: new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
            ],
        }),
    });

    /**
     * Registrar os comandos
     * Obs: Não sei se é uma boa prática ficar registrando sempre
     */

    const { token, id } = Config.getConfig('Config_Discord_BOT');
    const rest = new REST({ version: '10' }).setToken(token);

    console.log(
        'lista de comandos',
        commandHandle.commands.map((x) => x.name),
    );

    await rest.put(Routes.applicationCommands(id), {
        body: commandHandle.commands.map((command) =>
            (command as CommandCreator).getJSON(),
        ),
    });

    await bot.start();
}

start().catch((err: unknown) => {
    console.log(err);
});
