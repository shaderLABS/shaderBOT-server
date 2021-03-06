import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';

export const command: Command = {
    commands: ['delete'],
    superCommands: ['modproject', 'mproject'],
    help: 'Delete the project linked to the current channel.',
    minArgs: 0,
    maxArgs: 0,
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message) => {
        const { channel } = message;

        await db.query(/*sql*/ `UPDATE ticket SET project_channel_id = NULL WHERE project_channel_id = $1;`, [channel.id]);

        const project = (await db.query(/*sql*/ `DELETE FROM project WHERE channel_id = $1 RETURNING owners::TEXT[], role_id;`, [channel.id])).rows[0];
        if (!project) return sendError(channel, 'No project has been set up for this channel.');

        channel.lockPermissions();

        if (!channel.parentID || !settings.archiveCategoryIDs.includes(channel.parentID)) {
            const role = await channel.guild.roles.fetch(project.role_id).catch(() => undefined);
            if (role) role.delete();
        }

        sendSuccess(channel, 'Successfully deleted the project linked to this channel.');
        log(`${parseUser(message.author)} deleted the project linked to <#${channel.id}>.`);
    },
};
