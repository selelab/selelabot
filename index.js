import * as Discord from 'discord.js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./env.json'));
const client = new Discord.Client(); // Discordクライアントの作成

client.once('ready', () => {
    console.log("クライアント作成完了");
});

client.on('message', message => {
    if (message.content === '!ping') {
        message.channel.send('Pong.');
    }
    if (message.content === '!pingu') {
        message.channel.send('Pongu.');
    }
});

client.login(config.TOKEN); // ログイン
