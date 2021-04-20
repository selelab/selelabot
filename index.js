import * as Discord from 'discord.js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./env.json')); //設定ファイルの読み込み
const { token, prefix } = config;
const client = new Discord.Client(); // Discordクライアントの作成

client.once('ready', () => {
    console.log("クライアント作成完了");
});

client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') { message.channel.send('Pong.'); }
    else if (command === 'pingu') { message.channel.send('Pongu'); }
    else if (command === 'userinfo') { message.channel.send(`Your username: ${message.author.username}\nYour ID: ${message.author.id}`); }
    else if (command === 'serverinfo') { message.channel.send(`Server name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}`); }
    else if (command === 'server') {
        if (args[0] === 'name') message.channel.send(`Server name: ${message.guild.name}`);
        else if (args[0] === 'member') message.channel.send(`Total members: ${message.guild.memberCount}`);
        else if (!args[0]) message.channel.send('No arguments.');
        else message.channel.send('Invalid argument.');
    }
    else if (command === 'kick') {
        // grab the "first" mentioned user from the message
        // this will return a `User` object, just like `message.author`
        if (!message.mentions.users.size) {
            return message.reply('you need to tag a user in order to kick them!');
        }
        const taggedUser = message.mentions.users.first();
        message.channel.send(`You wanted to kick: ${taggedUser.username}`);
    }
    else { message.channel.send('Invalid command.'); }
});

client.login(token); // ログイン
