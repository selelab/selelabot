const Discord = require('discord.js');
const fs = require('fs');
const log4js = require('log4js');
const fetch = require('node-fetch');

log4js.configure('./setting/log4js.config.json'); //log4jsの設定の読み込み
const logger = log4js.getLogger();
const config = require('./setting/env.json'); //ログイン情報類の読み込み
const server_setting = require('./setting/selelab.json'); //各サーバ固有の設定の読み込み
const { discord_token, command_prefix, accounting_system_token } = config;

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
        /* サーバへの新規書き込みを取得し、それがbotへの命令であったならば、指定された処理を実行する */

        if (message.author.bot) return; //「botによる投稿である」 => 無視

        // サーバ内部リンク参照処理
        if (message.content.includes(`https://discord.com/channels/${message.guild.id}/`) || message.content.includes(`https://discordapp.com/channels/${message.guild.id}/`)) {
            try {
                const discord_link = message.content;
                const discord_link_regex = /([0-9]+)\/([0-9]+)$/;
                const [, target_channel_id, target_message_id] = discord_link.match(discord_link_regex); //貼られたDiscordサーバ内のリンクから、チャンネルidとメッセージidを取り出す
            
                const linked_channel = await message.guild.channels.cache.get(target_channel_id); //チャンネル情報取得
                const linked_message = await linked_channel.messages.fetch(target_message_id, true, true); //被参照メッセージ情報取得
                const linked_message_embed = new Discord.MessageEmbed()
                    .setAuthor(linked_message.author.username, linked_message.author.displayAvatarURL()) //参照先メッセージ投稿者のアイコンと名前
                    .setDescription(linked_message.content) //メッセージの内容
                    .setFooter(await linked_channel.name, message.guild.iconURL()) //サーバアイコンとリンク先のチャンネル名
                    .setTimestamp(linked_message.createdAt); //リンクされたメッセージの投稿日時

                message.channel.send(linked_message_embed); //送信

            } catch (e) {
                const e_msg = `リンク参照処理時にエラーが発生しました`;
                logger.error(e_msg + e);
                message.channel.send(e_msg);
            }
        }

        // エレラボ会計システム連携機能
        if (message.content.includes('selelab.com/admin/projects/')) {
            try {
                const uuid_regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/; // ref: https://www.setouchino.cloud/blogs/107
                const [project_uuid] = message.content.match(uuid_regex);
                
                const response = await fetch(`https://selelab.com/api/admin/v1/projects/${project_uuid}`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': accounting_system_token
                        }
                    }
                );
                if (!response.ok) {
                    throw new Error(`${response.status} ${response.statusText} ${await response.text()}`);
                }
                const project_json = await response.json();

                const project_leader = project_json.leader.display_name;
                const project_title = project_json.title;
                const project_description = project_json.description;
                const project_type = (project_json.accounting_type == "soft") ? "ソフトウェア" : "ハードウェア";
                const project_status = (project_json.closed === true) ? "完了" : "進行中";
                const project_approval = (project_json.approvals[0].approved === true) ? "予算承認済み" : "予算未承認";
                const requested_budget = (project_approval == "予算未承認") ? project_json.sum_req_budget : "N/A";

                const project_embed = new Discord.MessageEmbed()
                    .setTitle(project_title) //プロジェクト名
                    .addField('概要', project_description) // プロジェクト概要
                    .addField('責任者', project_leader, true) //プロジェクトリーダー
                    .addField('種別', project_type, true)
                    .addField('状況', project_status, true)
                    .addField('上限額', project_json.sum_budget, true)
                    .addField('支出額', project_json.sum_purchase_price, true)
                    .addField('未承認額', requested_budget, true);
                
                message.channel.send(project_embed); //送信

            } catch (e) {
                const e_msg = `会計システム参照時にエラーが発生しました`;
                logger.error(e_msg + e);
                message.channel.send(e_msg);
            }
        }

        // コマンド実行機能
        if (message.content.startsWith(command_prefix)) { //「投稿にコマンドのprefixがついていない」 => コマンド処理開始
            const args = message.content.slice(command_prefix.length).split(/[ 　]+/); //引数一覧を取得(半角スペースまたは全角スペースで引数を区切る)
            const commandName = args.shift().toLowerCase(); //コマンド名を取得

            if (!client.commands.has(commandName)) { //指定されたコマンド名が存在しなかった時の処理
                return message.reply(`コマンド "${commandName}" は存在しません`);
            }

            const command = client.commands.get(commandName); //コマンドオブジェクトを代入

            try {
                command.execute(message, args); //コマンドを実行
                logger.info(`[message] コマンド "${commandName}" が実行されました`);
            } catch (e) { //エラーハンドリング
                const e_msg = `コマンド "${commandName}" 実行時にエラーが発生しました`;
                logger.error(e_msg + e);
                message.reply(e_msg);
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
})();