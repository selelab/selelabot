const { Client, Intents, Collection } = require('discord.js');
const fs = require('fs');
const log4js = require('log4js');

log4js.configure('./setting/log4js.config.json'); //log4jsの設定の読み込み
const logger = log4js.getLogger();
const config = require('./setting/env.json'); //ログイン情報類の読み込み
const server_setting = require('./setting/selelab.json'); //各サーバ固有の設定の読み込み
const { discord_token, command_prefix, accounting_system_token } = config;

const auto_role_adder = require('./exports/autorole.js'); //役職自動付与プロトコル用のコード
const internal_link_referer = require('./exports/internal-link-referer.js'); //サーバ内部リンク参照
const accounting_system = require('./exports/accounting-system.js'); //エレラボ会計システム連携機能

const redis = require("redis");
const redis_client = redis.createClient(config.redis_url);

(async () => {
    try {
        const client = new Client({ //Discordクライアントの作成
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES], //Gateway Intentの有効化・指定
            partials: ['MESSAGE', 'REACTION', 'CHANNEL'], //Partialの設定
        });

        /* 別ディレクトリに格納してあるコマンドファイル群関係の記述 */
        client.commands = new Collection(); //コマンド一覧を格納するためのCollectionを作成
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
        client.on('messageCreate', async (message) => {
        /* サーバへの新規書き込みを取得し、それがbotへの命令であったならば、指定された処理を実行する */

            if (message.author.bot) return; //「botによる投稿である」 => 無視

            // サーバ内部リンク参照処理
            if (message.content.includes(`https://discord.com/channels/${message.guild.id}/`) || message.content.includes(`https://discordapp.com/channels/${message.guild.id}/`)) {
                await internal_link_referer.execute(message);
            }

            // エレラボ会計システム連携機能（プロジェクト情報の自動展開）
            if (message.content.includes('selelab.com/admin/projects/')) {
                await accounting_system.execute(message, accounting_system_token);
            }

            // コマンド実行機能
            if (message.content.startsWith(command_prefix)) { //「投稿にコマンドのprefixがついていない」 => コマンド処理開始
                const args = message.content.slice(command_prefix.length).split(/[ 　]+/); //引数一覧を取得(半角スペースまたは全角スペースで引数を区切る)
                const commandName = args.shift().toLowerCase(); //コマンド名を取得

                if (!client.commands.has(commandName)) { //指定されたコマンド名が存在しなかった時の処理
                    return message.reply({
                        content: `コマンド "${commandName}" は存在しません`,
                        allowedMentions: { repliedUser: true }
                    });
                }

                const command = client.commands.get(commandName); //コマンドオブジェクトを代入

                try {
                    command.execute(message, args); //コマンドを実行
                    logger.info(`[message] コマンド "${commandName}" が実行されました`);
                } catch (e) { //エラーハンドリング
                    const e_msg = `コマンド "${commandName}" 実行時にエラーが発生しました`;
                    logger.error(e_msg + e);
                    message.reply({
                        content: e_msg,
                        allowedMentions: { repliedUser: true }
                    });
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
            infoChannel.send(`${member.user.username}さんがこのサーバから脱退しました`);
            logger.info(`[guildMemberRemove] ${member.user.username}さんがサーバ"${member.guild.name}"から脱退しました`);
        });

        client.login(discord_token); //ログイン

        redis_client.psubscribe('sel_admin.*');

        redis_client.on('pmessage', async(_, event, data) => {
            if (event === 'sel_admin.project_created') {
                const project_id = JSON.parse(data).project_id;
                const discord_channel = client.channels.cache.find(channel => channel.name === 'プロジェクト申請場');
                await accounting_system.send_project_info(project_id, discord_channel, '新しいプロジェクトが作成されました:tada:');
            }
        });
    } catch (e) {
        console.log(e);
    }
})();
