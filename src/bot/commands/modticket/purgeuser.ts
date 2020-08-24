import { Command } from '../../commandHandler.js';
import { Message, TextChannel } from 'discord.js';
import Ticket from '../../../db/models/Ticket.js';
import { getUser } from '../../../misc/searchMessage.js';
import { client, settings } from '../../bot.js';

export const command: Command = {
    commands: ['purgeuser'],
    expectedArgs: '<@user|userID|username>',
    minArgs: 1,
    maxArgs: null,
    superCommand: 'modticket',
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message: Message, args: string[], text: string) => {
        const { channel } = message;

        try {
            let user = await getUser(message, args[0]);
            const deleteTickets = await Ticket.find({ author: user.id });

            if (deleteTickets.length === 0) return channel.send(`No tickets by ${user.username} were found.`);

            const guild = message.guild;
            if (!guild) return;
            const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
            if (!(subscriptionChannel instanceof TextChannel)) return;

            for (const ticket of deleteTickets) {
                if (!ticket.closed && ticket.channel) {
                    (await client.channels.fetch(ticket.channel)).delete();
                }

                if (ticket.subscriptionMessage) {
                    (await subscriptionChannel.messages.fetch(ticket.subscriptionMessage)).delete();
                }

                ticket.deleteOne();
            }

            channel.send(`Deleted ${deleteTickets.length} ticket(s) by ${user.username}.`);
        } catch (error) {
            if (error) channel.send(error);
        }
    },
};
