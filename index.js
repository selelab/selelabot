const Discord = require('discord.js');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./setting/env.json')); //ログイン情報類の読み込み
const server_setting = require('./setting/selelab.json'); //各サーバ固有の設定の読み込み
const { token, prefix } = config;

const auto_role_adder = require('./exports/autorole.js'); //役職自動付与プロトコル用のコード

const client = new Discord.Client({ //Discordクライアントの作成
    ws: {
        intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS', 'GUILD_PRESENCES'] //Gateway Intentの有効化・指定
    }
});

/* 一定時間だけ非同期で処理を待つ(単位：秒) */
const sleep = async (seconds) => new Promise((resolve, reject) => { setTimeout(() => { resolve(); }, seconds * 1000); });

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
client.on('guildMemberAdd', async (member) => {
    auto_role_adder.execute(client, member, member.guild.id); //役職自動付与プロトコル
});

/* サーバから誰かが脱退した時の動作 */
client.on('guildMemberRemove', (member) => {
    // 設定ファイルで指定されたチャンネルに脱退者の通知を送信
    const infoChannel = client.guilds.cache.get(member.guild.id).channels.cache.find(channel => channel.name === server_setting.CHANNEL.INFO);
    if (!infoChannel) {
        return console.error("[guildMemberRemove] 該当するチャンネルが見つかりませんでした");
    }
    infoChannel.send(`${member.user.username}さんがサーバから脱退しました`);
    console.log(`[guildMemberRemove] ${member.user.username}さんがサーバ"${member.guild.name}"から脱退しました`);
});

client.login(token); //ログイン
