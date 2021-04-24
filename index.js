const Discord = require('discord.js');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./setting/env.json')); //設定ファイルの読み込み
const server_setting = require('./setting/selelab.json');

const { token, prefix, guild_id } = config;
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
    console.log(`${member.displayName}がサーバ"${member.guild.name}"に参加しました`);
    
    if (member.guild.id !== guild_id) {
        return console.error("Another guild is specified");
    }

    if (member.user.bot) {
        return console.error("当該ユーザはbotです");
    }

    /* チャンネル名の完全一致で特定のチャンネルを指定し、そこで役職付与プロトコルを開始 */
    const welcomeChannel = client.guilds.cache.get(guild_id).channels.cache.find(channel => channel.name === server_setting.CHANNEL.WELCOME);
    if (!welcomeChannel) {
        return console.error("該当するチャンネルが見つかりませんでした");
    }

    /* メンションを飛ばす */
    welcomeChannel.send(`${member}さん、${member.guild.name}へようこそ！\n
    チャット上であなたが誰なのか識別できるようにするため、最初にあなたの学年や所属を登録する必要があります。\n
    必ず以下の質問に答えて下さい！`);

    await sleep(2); //2秒待つ

    /* 役職付与プロトコル開始 */
    welcomeChannel.send(`Q. ${member}さん、あなたは何年生ですか？\n
    次の選択肢の中からあなたの現在の学年に対応する番号を選び、その番号を__**半角数字1個だけで**__ここに投稿して下さい！`);
    const gradeEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle('あなたの現在の学年に対応する番号を投稿して下さい')
        .setDescription('入力するのは半角数字一個だけです。日本語とか記号とかは入力しないで下さい')
        .addFields(
            { name: `${server_setting.GRADE.FIRST}なら`, value: '1 と入力'},
            { name: `${server_setting.GRADE.SECOND}なら`, value: '2 と入力' },
            { name: `${server_setting.GRADE.THIRD}なら`, value: '3 と入力' },
            { name: `${server_setting.GRADE.FOURTH}なら`, value: '4 と入力' },
            { name: `${server_setting.GRADE.GRADUATED}なら`, value: '5 と入力' },
        );
    welcomeChannel.send(gradeEmbed);

    /* ユーザーの入力を受け取り、処理する */
    const msgFilter = msg => {
        return (msg.author.id === member.id && msg.content.match(/^[12345]$/)) ? true : false;
        //「新しく参加したメンバーの投稿である」かつ「1から5までの半角数字のどれか一つだけを含む」 => 条件に合致
    };
    welcomeChannel.awaitMessages(msgFilter, { max: 1, time: 2 * 60 * 1000 })
    // Promiseを解決すると、収集できたメッセージのCollectionを得られる
        .then(collected => {
            console.log('メッセージ: ' + collected.first().content); //collected.first()で取得できたメッセージを取得してログに出す
            
            try {
                const grade_number = Number(collected.first().content);
                const grade_name = server_setting.ROLE.find(data => data.NUM === grade_number);
                const grade_role = member.guild.roles.cache.find(role => role.name === grade_name.GRADE);

                member.roles.add(grade_role); //対応する学年役職を参加メンバーに追加

                /* 別のチャンネルで新規参加者のことをお知らせする */
                const infoChannel = client.guilds.cache.get(guild_id).channels.cache.find(channel => channel.name === server_setting.CHANNEL.INFO);
                if (!infoChannel) {
                    return console.error("該当するチャンネルが見つかりませんでした");
                }
                infoChannel.send(`${member}さん、あなたを${grade_role}として登録しました`);   
            } catch (e) {
                console.log(e);
            }
        })
        .catch(collected => {
            if (!collected.size) return console.log('メッセージが送信されませんでした(タイムアウト)');
            //何も収集できなかった場合を弾く(collected.sizeは取得できた個数、つまりこれは0のときを弾く)
        });
});

client.login(token); //ログイン
