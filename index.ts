/**
 * 
 * @name SkyMochaBot_Core
 * @description The core functionality of SkyMocha Bot that it can do better or the same as other bots
 *              @ 1984 handles slur censoring
 *              @ mee6 handles leveling
 *              Old code is in /testing/*.js
 *              Uses 
 *                  ./channels.ts
 *                  ./api/api.ts
 * @author SkyMocha
 * 
 */

const Discord = require("discord.js");
import { Emoji, Guild, GuildMember, Message, MessageReaction, ReactionEmoji, Role, Snowflake, User } from "discord.js";

const client = new Discord.Client({
    intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Discord.Intents.FLAGS.USER, Discord.Intents.FLAGS.GUILD_MEMBER],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER', 'GUILD_MEMBER'],
});

const config = require('./config.json');

import { Tootcord } from 'tootcord';
const Twitcord = require('./api/tweet.ts')
import TwitterApiBase from 'twitter-api-v2/dist/client.base';


const _Channels = require('./channels.ts');
const Channels = new _Channels(client);
type Roles = {
    [name: string]: Role;
}
type Emojis = {
    [name: string]: string;
}
type Mastos = {

    [url: string]: Tootcord

}
let emojis: Emojis = {}, roles: Roles = {}, mastos: Mastos = {};

function addRole(role: string): Role {
    return Channels.getGuild("SkyMocha").roles.cache.find((r: Role) => r.name.toLowerCase() == role.toLowerCase());
}
function getRole(role: string): Role {
    return roles[role.toLowerCase()];
}
function addRoleToUser(u: User, r: Role) {
    return Channels.getGuild("SkyMocha").members.fetch(u.id).then((user: GuildMember) => {
        user.roles.add(r)
    })
}
function removeRoleFromUser(u: User, r: Role) {
    Channels.getGuild("SkyMocha").members.fetch(u.id).then((user: GuildMember) => {
        user.roles.remove(r);
    })
}
function addMast(url: string) {

    mastos[url] = new Tootcord(`https://${url}`, config[url])

}

var twitter: typeof Twitcord;

client.on('ready', async () => {
    // ADD GUILDS
    await Channels.addGuild("SkyMocha", "970308742514090034");

    // ADD CHANNELS
    await Channels.addChannel("Bot Logs", "971019786349846568");
    await Channels.addChannel("Roles", "970308742983876620")
    await Channels.addChannel("Logs", "970309357029978112")
    await Channels.addChannel("Feed", "970309348523917332")

    // ADD USERS
    await Channels.addUser("SkyMocha", "340148471338106880");

    addMast('m.skymocha.net')
    addMast('mastodon.lol')
    addMast('toot.cat')

    twitter = new Twitcord({
        appKey: config['RECRUIT']['API_KEY'],
        appSecret: config['RECRUIT']['API_SEC'],
        accessToken: config['RECRUIT']['ACC_TOKEN'],
        accessSecret: config['RECRUIT']['ACC_SEC']
    }
    );

    emojis = {
        "He": "🤷‍♂️",
        "She": "🤷‍♀️",
        "They": "🤷",

        "Minor": "🐤",
        "Adult": "🐦",

        "OpenDM": "📬",
        "AskDM": "📭",
        "CloseDM": "📪",

        "Question": "❓"
    }

    let _roles: Array<Role> = Channels.getGuild("SkyMocha").roles.cache.array();
    for (let i = 0; i < _roles.length; i++) {
        if (_roles[i].id != '970308742514090034') { // Everyone Role
            let name: string = _roles[i].name.toLowerCase()
            roles[name] = addRole(name);
        }
    }

    // API = new SocialsAPI(client, Channels.getChannel('Feed'), Channels.getChannel('Bot Logs'));

    client.user.setActivity("SkyMocha", { type: "WATCHING" })
    let msg = `BOT IS ON UNDER ${client.user.tag} @ ${Channels.date()}`

    console.log(msg);

})

client.on('message', async (message: Message) => {

    if (message.author.bot || message.member == null)
        return

    let msg = message.content.toLowerCase();
    let msg_spit = msg.split('\n').join(' ').split(' '); // miss-spelled split oop

    let skymocha: Snowflake = Channels.getUser('SkyMocha');

    if (msg.startsWith('!m ') && message.author.id == skymocha) {

        let content: string = message.content.slice(2)

        let i = 0;
        let success = [];
        let success_str = '';
        let failed = [];
        let failed_str = '';
        let len = Object.values(mastos).length;
        let t = '';

        let tweet: boolean = await twitter.post_tweet(content, message.attachments)

        if (tweet)
            t = 'TWITTER SENT SUCCESSFULLY'
        else
            t = 'TWITTER FAILED'

        Object.values(mastos).forEach(async m => {

            let toot: boolean = await m.post_toot(content, message.attachments);

            i += 1;

            if (toot) {
                success.push(m)
                success_str += `${i}: ${m}`
            }
            else {
                failed.push(m)
                failed_str += `${i}: ${m}`
            }

            if (i == len) {
                message.reply(`
                    + + +\n
                    ${success.length}/${len} TOOTS SENT\n
                    ${failed.length}/${len} TOOTS FAILED\n
                    ${t}\n
                    + + +`
                )
            }

        })

    }

    // Bans a user
    if (msg.startsWith('!ban') && message.member.permissions.has('BAN_MEMBERS')) {
        let u = message.mentions.users.first();
        if (u == undefined)
            return message.channel.send(`NO BAN SPECIFIED`)
        let reason = msg_spit.slice(2).join(' ') // #0 is command #1 is user
        let ban_msg = `USER **${u.username}** BANNED BY **${message.author.username}** FOR *${reason}*`
        if (reason == undefined || reason == '')
            ban_msg = `USER **${u.username}** BANNED BY **${message.author.username}**`;
        Channels.getChannel('Logs').send(ban_msg).then(() => {
            if (message.author.id != Channels.getUserID('SkyMocha'))
                Channels.getGuild('SkyMocha').member(u).ban({ 'reason': ban_msg })
            else
                message.channel.send('NOT BANNING SKYMOCHA (duh)');
        })
    }

    // KICKS user
    if (msg.startsWith('!kick') && message.member.permissions.has('BAN_MEMBERS')) {
        let u = message.mentions.users.first();
        if (u == undefined)
            return message.channel.send(`NO KICK SPECIFIED`)
        let reason = msg_spit.slice(2).join(' ') // #0 is command #1 is user
        let ban_msg = `USER **${u.username}** KICKED BY **${message.author.username}** FOR *${reason}*`
        if (reason == undefined || reason == '')
            ban_msg = `USER **${u.username}** KICKED BY **${message.author.username}**`;
        Channels.getChannel('Logs').send(ban_msg).then(() => {
            if (message.author.id != Channels.getUserID('SkyMocha'))
                Channels.getGuild('SkyMocha').member(u).kick({ 'reason': ban_msg })
            else
                message.channel.send('NOT KICKING SKYMOCHA (duh)');
        })
    }

})

// REACTION ROLES //
client.on('messageReactionAdd', async (reaction: MessageReaction, user: User) => {

    // FETCHES REACTION
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    if (reaction.message.channel == Channels.getChannelID("Roles")) {

        switch (reaction.emoji.name) {
            case emojis['He']:
                addRoleToUser(user, getRole("he/him"))
                break;
            case emojis['She']:
                addRoleToUser(user, getRole("she/her"))
                break;
            case emojis['They']:
                addRoleToUser(user, getRole("they/them"))
                break;

            case emojis['OpenDM']:
                addRoleToUser(user, getRole("open dms"))
                break;
            case emojis['AskDM']:
                addRoleToUser(user, getRole("ask dms"))
                break;
            case emojis['ClosedDM']:
                addRoleToUser(user, getRole("closed dms"))
                break;

            case emojis['Minor']:
                addRoleToUser(user, getRole("17-"))
                break;
            case emojis['Adult']:
                addRoleToUser(user, getRole("18+"))
                break;

            case emojis['Question']:
                addRoleToUser(user, getRole("qotd"))
                break;

        }

        addRoleToUser(user, getRole('member'))

    }

})

client.on('messageReactionRemove', async (reaction: MessageReaction, user: User) => {

    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    if (reaction.message.channel == Channels.getChannelID("Roles")) {

        switch (reaction.emoji.name) {
            case emojis['He']:
                removeRoleFromUser(user, getRole("he/him"))
                break;
            case emojis['She']:
                removeRoleFromUser(user, getRole("she/her"))
                break;
            case emojis['They']:
                removeRoleFromUser(user, getRole("they/them"))
                break;

            case emojis['OpenDM']:
                removeRoleFromUser(user, getRole("open dms"))
                break;
            case emojis['AskDM']:
                removeRoleFromUser(user, getRole("ask dms"))
                break;
            case emojis['ClosedDM']:
                removeRoleFromUser(user, getRole("closed dms"))
                break;

            case emojis['Minor']:
                removeRoleFromUser(user, getRole("17-"))
                break;
            case emojis['Adult']:
                removeRoleFromUser(user, getRole("18+"))
                break;

            case emojis['Question']:
                removeRoleFromUser(user, getRole("qotd"))
                break;
        }

    }

})

client.login(config.TOKEN);