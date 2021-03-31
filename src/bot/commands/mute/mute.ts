import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { mute } from '../../lib/muteUser.js';
import { getMember, getUser, removeArgumentsFromText } from '../../lib/searchMessage.js';
import { formatTimeDate, secondsToString, splitString, stringToSeconds } from '../../lib/time.js';

const expectedArgs = '<@user|userID|username> <time> [reason]';

export const command: Command = {
    commands: ['mute'],
    help: 'Mute a user for a specified amount of time.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;

        const reason = removeArgumentsFromText(text, args[1]);
        if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

        const targetMember = await getMember(args[0]).catch(() => undefined);
        const targetUser = targetMember?.user || (await getUser(args[0]).catch(() => undefined));
        if (!targetUser) return syntaxError(channel, 'mute ' + expectedArgs);

        if (targetMember && member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
            return sendError(channel, "You can't mute a user with a role higher than or equal to yours.", 'Insufficient Permissions');

        try {
            const time = stringToSeconds(splitString(args[1]));

            if (isNaN(time)) return sendError(channel, 'The specified time exceeds the range of UNIX time.');
            if (time < 10) return sendError(channel, "You can't mute someone for less than 10 seconds.");

            const { expire, dmed } = await mute(targetUser.id, time, member.id, reason, targetMember);
            sendSuccess(
                channel,
                `<@${targetUser.id}> has been muted for ${secondsToString(time)} (until ${formatTimeDate(expire)}):\n\`${reason || 'No reason provided.'}\`${
                    dmed ? '' : '\n\n*The target could not be DMed.*'
                }`
            );
        } catch (error) {
            sendError(channel, error);
        }
    },
};
