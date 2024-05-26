"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loader = void 0;
const discord_js_1 = require("discord.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Loader {
    static baseDir() {
        return path_1.default.resolve(__dirname, '../');
    }
    static image(imgPath, name) {
        const image = path_1.default.resolve(this.baseDir(), imgPath);
        return new discord_js_1.AttachmentBuilder(image, {
            name,
        });
    }
    static JSON(jsonPath) {
        const filename = path_1.default.resolve(this.baseDir(), jsonPath);
        const data = fs_1.default.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    }
}
exports.Loader = Loader;
//# sourceMappingURL=Loader.js.map