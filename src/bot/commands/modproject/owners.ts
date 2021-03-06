import { GuildMember } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { ownerOverwrites } from '../../lib/project.js';
import { getMember } from '../../lib/searchMessage.js';

const expectedArgs = '<@user|userID|username> [...]';

export const command: Command = {
    commands: ['owners'],
    superCommands: ['modproject', 'mproject'],
    help: 'Change the owner(s) of the project linked to the current channel.',
    expectedArgs,
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message, args) => {
        const { channel } = message;
        if (channel.parentID && settings.archiveCategoryIDs.includes(channel.parentID)) return sendError(channel, 'This project is archived.');

        let owners: Set<GuildMember> = new Set();

        for (const potentialID of args) {
            const user = await getMember(potentialID);
            if (user) owners.add(user);
        }

        if (owners.size === 0) return syntaxError(channel, 'project owners ' + expectedArgs);

        const project = await db.query(
            /*sql*/ `
            UPDATE project
            SET owners = $1
            FROM project old_project
            WHERE project.id = old_project.id
                AND project.channel_id = $2
            RETURNING old_project.owners::TEXT[] AS old_owners`,
            [[...owners].map((owner) => owner.id), channel.id]
        );

        if (project.rowCount === 0) return sendError(channel, 'This channel is not linked to a project.');
        const oldOwners: string[] = project.rows[0].old_owners;
        channel.overwritePermissions(channel.permissionOverwrites.filter((overwrite) => overwrite.type !== 'member' || !oldOwners.includes(overwrite.id)));

        for (const owner of owners) {
            channel.createOverwrite(owner, ownerOverwrites);
        }

        sendSuccess(channel, `Updated the channel owners from <@${oldOwners.join('>, <@')}> to ${[...owners].join(', ')}.`);
        log(`${parseUser(message.author)} updated the channel owners from <@${oldOwners.join('>, <@')}> to ${[...owners].join(', ')} in <#${channel.id}>.`);
    },
};
