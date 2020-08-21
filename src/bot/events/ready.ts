import { Event } from '../eventHandler.js';
import { client } from '../bot.js';

export const event: Event = {
    name: 'ready',
    callback: () => {
        if (!client.user) return console.error('Failed to login.');
        console.log(`Logged in as '${client.user.username}#${client.user.discriminator}'.`);
    },
};
