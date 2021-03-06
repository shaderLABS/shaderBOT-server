import { Command } from '../../commandHandler.js';
import { ban } from '../../lib/banUser.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { parseUser } from '../../lib/misc.js';
import { getMember, removeArgumentsFromText, requireUser } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['ban'],
    help: 'Ban a user.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs: '<@user|userID|username> ["delete"] [reason]',
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;

        try {
            const targetMember = await getMember(args[0], { author: message.author, channel });
            const targetUser = targetMember?.user || (await requireUser(args[0], { author: message.author, channel }));

            const deleteMessages = args[1]?.toLowerCase() === 'delete';
            const reason = removeArgumentsFromText(text, args[deleteMessages ? 1 : 0]);
            if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

            if (targetMember) {
                if (member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
                    return sendError(channel, "You can't ban a user with a role higher than or equal to yours.", 'Insufficient Permissions');

                if (!targetMember.bannable) return sendError(channel, 'This user is not bannable.');
            }

            const { dmed } = await ban(targetUser, member.id, reason, deleteMessages);
            sendSuccess(channel, `${parseUser(targetUser)} has been banned:\n\`${reason || 'No reason provided.'}\`${dmed ? '' : '\n\n*The target could not be DMed.*'}`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
