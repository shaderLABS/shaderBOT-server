import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { editMuteDuration } from '../../lib/edit/editMute.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { getUser } from '../../lib/searchMessage.js';
import stringToSeconds, { splitString } from '../../lib/stringToSeconds.js';

const expectedArgs = '<uuid|<@user|userID|username>> <time>';

export const command: Command = {
    commands: ['muteduration', 'md'],
    superCommands: ['edit'],
    help: 'Edit the duration of a mute.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { channel, author } = message;

        const time = stringToSeconds(splitString(args[1]));

        if (isNaN(time)) return sendError(channel, 'The specified time exceeds the range of UNIX time.');
        if (time < 10) return sendError(channel, "You can't mute someone for less than 10 seconds.");

        try {
            if (uuid.test(args[0])) {
                const { user_id, expire_timestamp } = await editMuteDuration(args[0], time, author.id);
                sendSuccess(
                    channel,
                    `Successfully edited the duration of <@${user_id}'s mute (${args[0]}) to ${time} seconds. They will be unmuted at ${new Date(
                        expire_timestamp
                    ).toLocaleString()}.`
                );
            } else {
                const user = await getUser(args[0], message.mentions);

                const latestMuteID = (await db.query(/*sql*/ `SELECT id FROM punishment WHERE "type" = 'mute' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [user.id]))
                    .rows[0];
                if (!latestMuteID) return sendError(channel, 'The specified user does not have any active mutes.');

                const { expire_timestamp } = await editMuteDuration(latestMuteID.id, time, author.id);
                sendSuccess(
                    channel,
                    `Successfully edited the duration of <@${user.id}>'s mute (${latestMuteID.id}) to ${time} seconds. They will be unmuted at ${new Date(
                        expire_timestamp
                    ).toLocaleString()}.`
                );
            }
        } catch (error) {
            sendError(channel, error);
        }
    },
};
