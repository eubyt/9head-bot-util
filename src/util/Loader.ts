import { AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';

export class Loader {
    private static baseDir() {
        return path.resolve(__dirname, '../');
    }

    public static image(imgPath: string, name: string) {
        const image = path.resolve(this.baseDir(), imgPath);
        return new AttachmentBuilder(image, {
            name,
        });
    }

    public static JSON(jsonPath: string) {
        const filename = path.resolve(this.baseDir(), jsonPath);
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data) as Record<string, unknown>;
    }
}
