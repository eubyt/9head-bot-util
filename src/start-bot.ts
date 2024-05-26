import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { CommandHandle } from './event/CommandHandle';
import { CommandCreator, PingCommand } from './command';
import { Config, DiscordBot } from './model';
import { AutoVoiceChannel } from './event/AutoVoiceChannel';
import { PrivateVoiceChannel } from './event/PrivateVoiceChannel';
import firebaseKey from '../config/firebase-admin.json';
import { ServiceAccount, cert, initializeApp } from 'firebase-admin/app';
import { firestore } from 'firebase-admin';
import { CanalPrivadoCommand } from './command/CanalPrivadoCommand';
import { CanalPrivadoRenameCommand } from './command/CanalPrivadoRenameCommand';

import http from 'http';
import express from 'express';

async function start(): Promise<void> {
    /// Firebase
    initializeApp({
        credential: cert(firebaseKey as ServiceAccount),
    });

    const db = firestore();

    /// Discord bot \/

    new Config(); //Loading Config

    // Criar os Eventos
    const commandHandle = new CommandHandle([
        new PingCommand(),
        new CanalPrivadoCommand(db),
        new CanalPrivadoRenameCommand(db),
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
     * Obs: Não sei se é uma boa praticar ficar registrando sempre
     */

    const { token, id } = Config.getConfig('Config_Discord_BOT');
    const rest = new REST({ version: '10' }).setToken(token);

    await rest.put(Routes.applicationCommands(id), {
        body: commandHandle.commands.map((command) =>
            (command as CommandCreator).getJSON(),
        ),
    });

    await bot.start();
}

const webServer = express();

webServer.get('/', (request, response) => {
    console.log('Ping Received');
    response.sendStatus(200);
});
webServer.listen(process.env.PORT);
setInterval(() => {
    http.get(`http://${process.env.PROJECT_DOMAIN ?? 'null'}.glitch.me/`);
}, 280000);

start().catch((err: unknown) => {
    console.log(err);
});
