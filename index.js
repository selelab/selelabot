import * as Discord from 'discord.js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./env.json')); //設定ファイルの読み込み
const prefix = config.PREFIX;
const client = new Discord.Client(); // Discordクライアントの作成

client.once('ready', () => {
    console.log("クライアント作成完了");
});

client.on('message', message => {
    if (!message.author.bot && message.content.charAt(0) === prefix) {
        if (message.content === `${prefix}ping`) {
            message.channel.send('Pong.');
        } else if (message.content === `${prefix}pingu`) {
            message.channel.send('Pongu.');
        } else if (message.content === `${prefix}servername`) {
            message.channel.send(`This server's name is: ${message.guild.name}`);
        } else if (message.content === `${prefix}server`) {
            message.channel.send(`Server name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}`);
        } else if (message.content === `${prefix}userinfo`) {
            message.channel.send(`Your username: ${message.author.username}\nYour ID: ${message.author.id}`);
        } else { message.channel.send('Invalid command.'); }
    }
});

client.login(config.TOKEN); // ログイン
