"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const CommandHandle_1 = require("./event/CommandHandle");
const command_1 = require("./command");
const model_1 = require("./model");
const AutoVoiceChannel_1 = require("./event/AutoVoiceChannel");
const PrivateVoiceChannel_1 = require("./event/PrivateVoiceChannel");
const firebase_admin_json_1 = __importDefault(require("../config/firebase-admin.json"));
const app_1 = require("firebase-admin/app");
const firebase_admin_1 = require("firebase-admin");
const CanalPrivadoCommand_1 = require("./command/CanalPrivadoCommand");
const CanalPrivadoRenameCommand_1 = require("./command/CanalPrivadoRenameCommand");
async function start() {
    /// Firebase
    (0, app_1.initializeApp)({
        credential: (0, app_1.cert)(firebase_admin_json_1.default),
    });
    const db = (0, firebase_admin_1.firestore)();
    /// Discord bot \/
    new model_1.Config(); //Loading Config
    // Criar os Eventos
    const commandHandle = new CommandHandle_1.CommandHandle([
        new command_1.PingCommand(),
        new CanalPrivadoCommand_1.CanalPrivadoCommand(db),
        new CanalPrivadoRenameCommand_1.CanalPrivadoRenameCommand(db),
    ]);
    // AutoVoiceChannel
    const autoVoiceChannel = new AutoVoiceChannel_1.AutoVoiceChannel(model_1.Config.getConfig().AutoVoiceChannel);
    const privateVoiceChannel = new PrivateVoiceChannel_1.PrivateVoiceChannel(model_1.Config.getConfig().PrivateVoiceChannel, db);
    const bot = new model_1.DiscordBot({
        commandHandle,
        autoVoiceChannel,
        privateVoiceChannel,
        client: new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildVoiceStates,
            ],
        }),
    });
    /**
     * Registrar os comandos
     * Obs: Não sei se é uma boa praticar ficar registrando sempre
     */
    const { token, id } = model_1.Config.getConfig('Config_Discord_BOT');
    const rest = new discord_js_1.REST({ version: '10' }).setToken(token);
    await rest.put(discord_js_1.Routes.applicationCommands(id), {
        body: commandHandle.commands.map((command) => command.getJSON()),
    });
    await bot.start();
}
start().catch((err) => {
    console.log(err);
});
//# sourceMappingURL=start-bot.js.map