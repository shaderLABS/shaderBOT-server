import { MessageEmbed, User } from 'discord.js';
import { db } from '../../db/postgres.js';
import { embedColor } from './embeds.js';
import log from './log.js';
import { getGuild, parseUser } from './misc.js';
import { store } from './punishments.js';
import { formatTimeDate, secondsToString } from './time.js';

/*******
 * BAN *
 *******/

export async function tempban(user: User, duration: number, modID: string | null = null, reason: string | null = null, deleteMessages: boolean = false) {
    const guild = getGuild();
    if (!guild) return Promise.reject('No guild found.');

    const timestamp = new Date();
    const expire = new Date(timestamp.getTime() + duration * 1000);
    let dmed = true;

    try {
        const overwrittenPunishment = (
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment
                    WHERE "type" = 'ban' AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, expire_timestamp, timestamp
                ), inserted_rows AS (
                    INSERT INTO past_punishment
                    SELECT id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows
                )
                SELECT * FROM moved_rows;`,
                [user.id, timestamp, modID]
            )
        ).rows[0];

        if (overwrittenPunishment) {
            const timeout = store.tempbans.get(user.id);
            if (timeout) {
                clearTimeout(timeout);
                store.tempbans.delete(user.id);
            }
        }

        if (deleteMessages && (await guild.fetchBan(user).catch(() => undefined))) {
            await guild.members.unban(user, 'Rebanning an already banned user in order to delete their messages.');
        }

        const tempban = (
            await db.query(
                /*sql*/ `
                INSERT INTO punishment (user_id, "type", mod_id, reason, expire_timestamp, timestamp)
                VALUES ($1, 'ban', $2, $3, $4, $5)
                RETURNING id;`,
                [user.id, modID, reason, expire, timestamp]
            )
        ).rows[0];

        await user
            .send(
                new MessageEmbed({
                    author: { name: 'You have been banned from shaderLABS.' },
                    description: punishmentToString({ id: tempban.id, reason: reason || 'No reason provided.', mod_id: modID, expire_timestamp: expire, timestamp }),
                    color: embedColor.blue,
                })
            )
            .catch(() => {
                dmed = false;
            });

        guild.members.ban(user, { reason: reason || 'No reason provided.', days: deleteMessages ? 7 : 0 });
        log(
            `${modID ? parseUser(modID) : 'System'} temporarily banned ${parseUser(user)} for ${secondsToString(duration)} (until ${formatTimeDate(expire)}):\n\`${reason || 'No reason provided.'}\`${
                overwrittenPunishment ? `\n\n${parseUser(user)}'s previous ban has been overwritten:\n ${punishmentToString(overwrittenPunishment)}` : ''
            }${dmed ? '' : '\n\n*The target could not be DMed.*'}`,
            'Temporary Ban'
        );

        if (expire.getTime() - timestamp.getTime() < new Date().setHours(24, 0, 0, 0) - timestamp.getTime()) {
            const timeout = setTimeout(() => {
                unban(user.id).catch((e) => log(`Failed to unban ${parseUser(user.id)}: ${e}`));
            }, duration * 1000);

            const previousTimeout = store.tempbans.get(user.id);
            if (previousTimeout) clearTimeout(previousTimeout);

            store.tempbans.set(user.id, timeout);
        }
    } catch (error) {
        console.log(error);
        log(`Failed to temporarily ban ${parseUser(user)} for ${secondsToString(duration)}.`);
        return Promise.reject(`Failed to temporarily ban ${parseUser(user)} for ${secondsToString(duration)}.`);
    }

    return { expire, dmed };
}

export async function ban(user: User, modID: string | null = null, reason: string | null = null, deleteMessages: boolean = false) {
    const guild = getGuild();
    if (!guild) return Promise.reject('No guild found.');

    const timestamp = new Date();
    let dmed = true;

    try {
        const overwrittenPunishment = (
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment
                    WHERE "type" = 'ban' AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, expire_timestamp, timestamp
                ), inserted_rows AS (
                    INSERT INTO past_punishment
                    SELECT id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows
                )
                SELECT * FROM moved_rows;`,
                [user.id, timestamp, modID]
            )
        ).rows[0];

        if (overwrittenPunishment) {
            const timeout = store.tempbans.get(user.id);
            if (timeout) {
                clearTimeout(timeout);
                store.tempbans.delete(user.id);
            }
        }

        if (deleteMessages && (await guild.fetchBan(user).catch(() => undefined))) {
            await guild.members.unban(user, 'Rebanning an already banned user in order to delete their messages.');
        }

        const ban = (
            await db.query(
                /*sql*/ `
                INSERT INTO punishment (user_id, "type", mod_id, reason, timestamp)
                VALUES ($1, 'ban', $2, $3, $4)
                RETURNING id;`,
                [user.id, modID, reason, timestamp]
            )
        ).rows[0];

        await user
            .send(
                new MessageEmbed({
                    author: { name: 'You have been banned from shaderLABS.' },
                    description: punishmentToString({ id: ban.id, reason: reason || 'No reason provided.', mod_id: modID, timestamp }),
                    color: embedColor.blue,
                })
            )
            .catch(() => {
                dmed = false;
            });

        guild.members.ban(user, { reason: reason || 'No reason provided.', days: deleteMessages ? 7 : 0 });
        log(
            `${modID ? parseUser(modID) : 'System'} permanently banned ${parseUser(user)}:\n\`${reason || 'No reason provided.'}\`${
                overwrittenPunishment ? `\n\n${parseUser(user)}'s previous ban has been overwritten:\n ${punishmentToString(overwrittenPunishment)}` : ''
            }${dmed ? '' : '\n\n*The target could not be DMed.*'}`,
            'Ban'
        );
    } catch (error) {
        console.error(error);
        log(`Failed to ban ${parseUser(user)}.`);
        return Promise.reject('Error while accessing the database.');
    }

    return { dmed };
}

export function punishmentToString(punishment: any) {
    return (
        `**Reason:** ${punishment.reason || 'No reason provided.'}\n` +
        `**Moderator:** ${punishment.mod_id ? parseUser(punishment.mod_id) : 'System'}\n` +
        `**ID:** ${punishment.id}\n` +
        `**Created At:** ${formatTimeDate(new Date(punishment.timestamp))}\n` +
        `**Expiring At:** ${punishment.expire_timestamp ? formatTimeDate(new Date(punishment.expire_timestamp)) : 'Permanent'}`
    );
}

/*********
 * UNBAN *
 *********/

export async function unban(userID: string, modID?: string) {
    const guild = getGuild();
    if (!guild) return Promise.reject('No guild found.');

    try {
        const deleted = (
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment
                    WHERE "type" = 'ban' AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, timestamp
                )
                INSERT INTO past_punishment
                SELECT id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows;`,
                [userID, new Date(), modID || null]
            )
        ).rowCount;
        if (deleted === 0) return Promise.reject(`The user ${parseUser(userID)} is not banned.`);
    } catch (error) {
        console.error(error);
        log(`Failed to unban ${parseUser(userID)}: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    await guild.members.unban(userID);

    const timeout = store.tempbans.get(userID);
    if (timeout) {
        clearTimeout(timeout);
        store.tempbans.delete(userID);
    }

    log(`${modID ? parseUser(modID) : 'System'} unbanned ${parseUser(userID)}.`, 'Unban');
}
