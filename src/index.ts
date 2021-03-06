import 'reflect-metadata';
import { client, startBot } from './bot/bot.js';
import log from './bot/lib/log.js';
import { connectPostgreSQL, db } from './db/postgres.js';
import { startWebserver, stopWebserver } from './web/server.js';

export const botOnly = process.env.BOT_ONLY === 'true';
export const production = process.env.NODE_ENV === 'production';

export function shutdown(code: number = 0) {
    console.log('Shutting down...');
    if (!botOnly) stopWebserver();
    db.end().catch(() => undefined);
    client.destroy();
    process.exit(code);
}

if (!production) {
    process.on('uncaughtException', async (error) => {
        console.error('\x1b[31m%s\x1b[0m', 'Uncaught Exception', '\n', error);
        if (client.user) await log('```' + error + '```', 'Uncaught Exception :(')?.catch(() => undefined);
        shutdown(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
        console.error('\x1b[31m%s\x1b[0m', 'Unhandled Rejection', '\n', promise, reason);
        if (client.user) await log('```' + reason + '```', 'Unhandled Rejection :(')?.catch(() => undefined);
        shutdown(1);
    });
}

await connectPostgreSQL();
startBot();
if (!botOnly) startWebserver();
