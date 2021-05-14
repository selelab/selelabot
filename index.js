const Discord = require('discord.js');
const fs = require('fs');
const log4js = require('log4js');

log4js.configure('./setting/log4js.config.json'); //log4jsの設定の読み込み
const logger = log4js.getLogger();
const config = require('./setting/env.json'); //ログイン情報類の読み込み
const server_setting = require('./setting/selelab.json'); //各サーバ固有の設定の読み込み
const { token, prefix } = config;

const auto_role_adder = require('./exports/autorole.js'); //役職自動付与プロトコル用のコード

(async () => {
    const client = new Discord.Client({ //Discordクライアントの作成
        ws: {
            intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS', 'GUILD_PRESENCES'] //Gateway Intentの有効化・指定
        },
        partials: ['MESSAGE', 'REACTION', 'CHANNEL'], //Partialの設定
    });
    
    /* 別ディレクトリに格納してあるコマンドファイル群関係の記述 */
    client.commands = new Discord.Collection(); //コマンド一覧を格納するためのCollectionを作成
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js')); //'./commands'ディレクトリを走査し、中にあるjsファイルの一覧を作成
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`); //各ファイルからコマンドの情報を読み込む
        client.commands.set(command.name, command); //読み込んだコマンドをセット
    }

    /* クライアントが準備完了した際の動作 */
    client.once('ready', () => {
        logger.info("[ready] クライアント作成完了");
    });

    /* サーバに新規書き込みがあった際の動作 */
    client.on('message', async (message) => {
        /* サーバへの新規書き込みを取得し、それがbotへのコマンド命令であったならば、指定されたコマンドを実行する */

        if (message.author.bot) return; //「botによる投稿である」 => 無視

        if (message.content.startsWith(`https://discord.com/channels/${message.guild.id}/`)) {
            const discord_link = message.content;
            const discord_link_regex = /([0-9]+)\/([0-9]+)$/;
            const [, target_channel_id, target_message_id] = discord_link.match(discord_link_regex); //貼られたDiscordサーバ内のリンクから、チャンネルidとメッセージidを取り出す
            
            const linked_message = await message.guild.channels.cache.get(target_channel_id).messages.fetch(target_message_id, true, true); //指定された
            const linked_message_embed = new Discord.MessageEmbed()
                .setAuthor(message.author.username, message.author.displayAvatarURL()) //投票作成者のアイコンと名前
                .setDescription(linked_message.content) //メッセージの内容
                .setTimestamp(linked_message.createdAt); //リンクされたメッセージの投稿日時
            message.channel.send(linked_message_embed); //送信
        }

        if (message.content.startsWith(prefix)) { //「投稿にコマンドのprefixがついていない」 => コマンド処理開始
            const args = message.content.slice(prefix.length).split(/[ 　]+/); //引数一覧を取得(半角スペースまたは全角スペースで引数を区切る)
            const commandName = args.shift().toLowerCase(); //コマンド名を取得

            if (!client.commands.has(commandName)) { //指定されたコマンド名が存在しなかった時の処理
                return message.reply(`コマンド "${commandName}" は存在しません`);
            }

            const command = client.commands.get(commandName); //コマンドオブジェクトを代入

            try {
                command.execute(message, args); //コマンドを実行
            } catch (e) { //エラーハンドリング
                logger.error(e);
                message.reply(`コマンド "${commandName}" 実行時にエラーが発生しました`);
            }
        }
    });

    /* サーバに誰かが新規参加した時の動作 */
    client.on('guildMemberAdd', (member) => {
        auto_role_adder.execute(client, member, member.guild.id); //役職自動付与プロトコル
    });

    /* サーバから誰かが脱退した時の動作 */
    client.on('guildMemberRemove', (member) => {
        // 設定ファイルで指定されたチャンネルに脱退者の通知を送信
        const infoChannel = client.guilds.cache.get(member.guild.id).channels.cache.find(channel => channel.name === server_setting.CHANNEL.INFO);
        if (!infoChannel) {
            return logger.error("[guildMemberRemove] 該当するチャンネルが見つかりませんでした");
        }
        infoChannel.send(`${member.user.username}さんがサーバから脱退しました`);
        logger.info(`[guildMemberRemove] ${member.user.username}さんがサーバ"${member.guild.name}"から脱退しました`);
    });

    client.login(token); //ログイン
})();