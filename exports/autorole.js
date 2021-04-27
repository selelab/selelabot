const Discord = require('discord.js');
const server_setting = require('../setting/selelab.json'); //各サーバ固有の設定の読み込み

const sleep = async (seconds) => new Promise((resolve, reject) => { setTimeout(() => { resolve(); }, seconds * 1000); });

module.exports = {
    async execute(client, member, guild_id) {
        console.log(`${member.displayName}がサーバ"${member.guild.name}"に参加しました`);

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
        チャット上であなたが誰なのか識別できるようにするため、最初にあなたの学年を登録する必要があります。\n
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
                console.log('送信された番号: ' + collected.first().content); //collected.first()で取得できたメッセージを取得してログに出す
                
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
                    infoChannel.send(`${member}さん、上智エレラボへようこそ！あなたを${grade_role}として登録しました。`);
                } catch (e) {
                    console.log(e);
                }
            })
            .catch(collected => {
                if (!collected.size) return console.log('メッセージが送信されませんでした(タイムアウト)');
                //何も収集できなかった場合を弾く(collected.sizeは取得できた個数、つまりこれは0のときを弾く)
            });        
    }
};