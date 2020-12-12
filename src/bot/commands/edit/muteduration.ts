import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import uuid from 'uuid-random';
import { getUser } from '../../lib/searchMessage.js';
import { db } from '../../../db/postgres.js';
import { editMuteDuration } from '../../lib/edit/editMute.js';
import stringToSeconds, { splitString } from '../../lib/stringToSeconds.js';

const expectedArgs = '<uuid|<@user|userID|username>> <time>';

export const command: Command = {
    commands: ['muteduration', 'md'],
    superCommands: ['edit'],
    help: 'Edit the duration of a specified mute or the most recent mute of a user.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { channel, author } = message;

        const time = stringToSeconds(splitString(args[1]));

        if (isNaN(time) || time < 10) {
            sendError(channel, "You can't mute someone for less than 10 seconds.");
            return;
        }

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
                const user = await getUser(message, args[0]);

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
