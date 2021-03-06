import fs from 'fs/promises';
import path from 'path';
import { pastas } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { stringToFileName, writePasta } from '../../lib/pastaAutoResponse.js';
import { removeArgumentsFromText } from '../../lib/searchMessage.js';
import { pastaPath } from '../../pastaHandler.js';

export const command: Command = {
    commands: ['update'],
    superCommands: ['modpasta', 'mpasta'],
    help: 'Update a pasta.',
    expectedArgs: '<alias> <path> <JSONValue>',
    minArgs: 2,
    maxArgs: null,
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (message, args, text) => {
        const { channel } = message;

        try {
            const pasta = pastas.get(args[0]);
            if (!pasta) return sendError(channel, 'The specified pasta does not exist.');

            const objPath = args[1].split('.');

            const rawValue = removeArgumentsFromText(text, args[1]);
            const jsonValue = rawValue ? JSON.parse(rawValue) : undefined;

            setValue(pasta, objPath, jsonValue);

            pastas.set(pasta.alias, pasta);
            await writePasta(pasta);

            if (args[0] !== pasta.alias) {
                pastas.delete(args[0]);
                await fs.rm(path.join(pastaPath, stringToFileName(args[0])));
            }

            sendSuccess(channel, `Successfully updated the pasta \`${pasta.alias}\`.`);
            log(`${parseUser(message.author)} updated the pasta \`${pasta.alias}\`.`);
        } catch (error) {
            sendError(channel, 'Invalid JSON value.');
        }
    },
};

function setValue(obj: any, path: string[], value: any) {
    path.reduce((a, b, i) => {
        if (i + 1 === path.length) {
            a[b] = value;
            return value;
        }
        if (a[b] === undefined) a[b] = {};
        return a[b];
    }, obj);
}
