import { Command, syntaxError } from '../commandHandler.js';
import { sendError, sendSuccess } from '../lib/embeds.js';
import { client } from '../bot.js';
import { mute } from '../lib/mute.js';

const expectedArgs = '<@user|userID> <seconds>';

export const command: Command = {
    commands: ['mute'],
    help: 'Mute a user for a specified amount of time.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { member, channel } = message;
        if (!member) return;

        const user = message.mentions.members?.first() || (await client.guilds.cache.first()?.members.fetch(args[0]));
        if (!user) return syntaxError(channel, expectedArgs);

        if (member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
            return sendError(channel, "You can't mute a user with a role higher than or equal to yours.", 'INSUFFICIENT PERMISSIONS');

        const time = +args[1];

        if (isNaN(time) || time <= 10) {
            sendError(channel, 'Please use a number higher than 10 as the second argument.');
            return;
        }

        const reason = args.slice(2).join(' ');

        const expire = await mute(user, time, member.id, reason);
        sendSuccess(channel, `<@${user.id}> has been muted for ${time} seconds (until ${expire.toLocaleString()}):\n\n ${reason || 'No reason provided.'}`);
    },
};
