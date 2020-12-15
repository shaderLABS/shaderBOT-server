import { Message } from 'discord.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { getUser } from '../../lib/searchMessage.js';
import { purgeAllTickets } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['purgeuser'],
    help: 'Purge all tickets by a specific user.',
    expectedArgs: '<@user|userID|username>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['modticket', 'mticket'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message: Message, args: string[]) => {
        const { channel, guild } = message;
        if (!guild) return;

        try {
            const user = await getUser(args[0], message.mentions);
            const ticket = await purgeAllTickets(user, guild);

            sendSuccess(channel, 'Purged all tickets.');
            log(`<@${message.author.id}> purged all tickets by <@${user.id}>:\n\n\`\`\`${ticket.titles.join('\n')}\`\`\``);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
