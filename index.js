const Discord = require('discord.js');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./env.json')); //設定ファイルの読み込み
const { token, prefix } = config;
const client = new Discord.Client(); // Discordクライアントの作成

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js')); //'./commands'ディレクトリを走査し、中にあるjsファイルの一覧を作成

for (const file of commandFiles) {
    const command = require(`./commands/${file}`); //各ファイルからコマンドの情報を読み込む
    client.commands.set(command.name, command); //読み込んだコマンドをセット
}

client.once('ready', () => {
    console.log("クライアント作成完了");
});

client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if (!client.commands.has(command)) {
        return message.reply('Such a command does not exist!');
    }
    try {
        client.commands.get(command).execute(message, args);
    } catch (e) {
        console.error(e);
        message.reply('there was an error trying to execute that command!');
    }
});

client.login(token); // ログイン
