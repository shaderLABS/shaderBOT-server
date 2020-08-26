import { Command } from '../../commandHandler.js';
import { Message, TextChannel } from 'discord.js';
import { client, settings } from '../../bot.js';
import { getTicketMod } from '../../../misc/searchMessage.js';
import { sendSuccess, sendError } from '../../../misc/embeds.js';
import log from '../../../misc/log.js';

export const command: Command = {
    commands: ['close'],
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_MESSAGES'],
    superCommand: 'modticket',
    callback: async (message: Message, args: string[], text: string) => {
        const { member } = message;
        if (!member) return;

        try {
            let ticket = await getTicketMod(message, args, text, false);

            ticket.closed = true;

            if (ticket.subscriptionMessage) {
                const guild = message.guild;
                if (!guild) return;
                const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
                if (!(subscriptionChannel instanceof TextChannel)) return;

                (await subscriptionChannel.messages.fetch(ticket.subscriptionMessage)).delete();
                ticket.subscriptionMessage = '';
            }

            if (ticket.channel) {
                (await client.channels.fetch(ticket.channel)).delete();
                ticket.channel = undefined;
            }

            await ticket.save();
            sendSuccess(message.channel, 'Ticket closed.');
            log(`<@${member.id}> closed the ticket "${ticket.title}" by <@${ticket.author}>.`);
        } catch (error) {
            if (error) sendError(message.channel, error);
        }
    },
};