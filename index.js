const Discord = require('discord.js');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./env.json')); //設定ファイルの読み込み
const { token, prefix, guild_id } = config;
const client = new Discord.Client(); // Discordクライアントの作成

/* 別ディレクトリに格納してあるコマンドファイル群関係の記述 */
client.commands = new Discord.Collection(); //コマンド一覧を格納するためのCollectionを作成
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js')); //'./commands'ディレクトリを走査し、中にあるjsファイルの一覧を作成
for (const file of commandFiles) {
    const command = require(`./commands/${file}`); //各ファイルからコマンドの情報を読み込む
    client.commands.set(command.name, command); //読み込んだコマンドをセット
}

/* クライアントが準備完了した際の動作 */
client.once('ready', () => {
    console.log("クライアント作成完了");
});

/* サーバに新規書き込みがあった際の動作 */
client.on('message', message => {
    /* サーバへの新規書き込みを取得し、それがbotへのコマンド命令であったならば、指定されたコマンドを実行する */

    if (!message.content.startsWith(prefix) || message.author.bot) return; //「投稿にコマンドのprefixがついていない」または「botによる投稿である」 => 無視

    const args = message.content.slice(prefix.length).split(/ +/); //引数一覧を取得
    const commandName = args.shift().toLowerCase(); //コマンド名を取得

    if (!client.commands.has(commandName)) { //指定されたコマンド名が存在しなかった時の処理
        return message.reply(`コマンド "${commandName}" は存在しません`);
    }

    const command = client.commands.get(commandName); //コマンドオブジェクトを代入

    try {
        command.execute(message, args); //コマンドを実行
    } catch (e) { //エラーハンドリング
        console.error(e);
        message.reply(`コマンド "${commandName}" 実行時にエラーが発生しました`);
    }
});

/* サーバに誰かが新規参加した時の動作 */
client.on('message', member => {
    console.log(`${member.user} joined the ${member.guild.name} server`);
    
    if (member.guild.id !== guild_id) {
        return console.error("Another guild is specified");
    }

    const welcomeChannel = client.guilds.cache.get(guild_id).channels.cache.find(channel => channel.name === 'ようこそ');
    if (!welcomeChannel) {
        return console.error("Cannot find the channel");
    }
    welcomeChannel.send(`${member}さん、${member.guild.name}へようこそ！`);

    /* 新規参加者が最初に入ってきたチャンネルで、役職付与プロトコルを開始 */

    /* メンションを飛ばす */

    /* 役職付与 */
});

client.login(token); //ログイン
