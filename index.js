const Discord = require('discord.js');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./env.json')); //設定ファイルの読み込み
const { token, prefix, guild_id } = config;
const client = new Discord.Client({
    ws: {
        intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS', 'GUILD_PRESENCES'] //Gateway Intentの有効化・指定
    }
}); // Discordクライアントの作成

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
client.on('guildMemberUpdate', member => {
    console.log(`${member.displayName} がサーバ "${member.guild.name}" に参加しました`);
    
    if (member.guild.id !== guild_id) {
        return console.error("Another guild is specified");
    }

    if (member.user.bot) {
        return console.error("当該ユーザはbotです");
    }

    /* チャンネル名で特定のチャンネルを指定し、そこで役職付与プロトコルを開始 */
    const welcomeChannel = client.guilds.cache.get(guild_id).channels.cache.find(channel => channel.name === 'テストチャンネルその1');
    if (!welcomeChannel) {
        return console.error("該当するチャンネルが見つかりませんでした");
    }

    /* メンションを飛ばす */
    welcomeChannel.send(`${member}さん、${member.guild.name}へようこそ！\nチャット上であなたが誰なのか識別できるようにするため、最初にあなたの学年や所属を登録する必要がありますので、必ず以下の質問に答えて下さい！`);

    /* 会員種別の識別を確認 */
    // welcomeChannel.send(`質問その1\n${member}さん、あなたは`);

    /* 役職付与 */
    welcomeChannel.send(`質問そのn\n${member}さん、あなたは何年生ですか？\n次の選択肢の中から対応する数字を選んで、その数字を**半角数字で**入力して下さい！`);
    const exampleEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setDescription('description')
        .addFields(
            { name: 1, value: '1年生' },
            { name: 2, value: '2年生'},
            { name: 3, value: '3年生'},
        );
    welcomeChannel.send(exampleEmbed);

    // const mainChannel = client.guilds.cache.get(guild_id).channels.cache.find(channel => channel.name === 'main');
    // if (!mainChannel) {
    //     return console.error("該当するチャンネルが見つかりませんでした");
    // }
});

client.login(token); //ログイン
