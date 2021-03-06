# selelabot

## これはなに

エレラボDiscordサーバ用Botのソースコード

### 現在の機能

- サーバ新規参加者への対話式役職付与
- サーバ脱退者の報告
- リアクションによる投票作成コマンドの実装
- サーバ内の特定のメッセージに対するDiscordリンクが貼られると、該当する投稿の内容を自動で表示する機能
- エレラボGoogleアカウントの二段階要素認証コードの生成

### ロードマップ

- 新規作成されたテキストチャンネルの「チャンネルの管理」権限を自動で設定し、削除プロテクトを掛ける
- 新年度移行時の学年役職自動更新

その他、需要と要望に応じて新機能を随時追加予定（Issueも参照）

## 必要なもの

- Node.js (v16.6以上)
- nvm (0.39.1で動作確認)
- ご家庭にあるNode.js対応の適当なプロセスマネージャ（エレラボサーバではpm2を採用）

## 環境構築

1. Node.jsを導入
2. nvmを導入 ([導入方法](https://github.com/nvm-sh/nvm#installing-and-updating))
3. 以下を実行
```
$ git clone https://github.com/selelab/selelabot
$ cd selelabot
$ npm install
$ npm install pm2 -g
$ nvm use
```
## 実行方法

※pm2の利用を仮定、カレントディレクトリが``selelabot``の時：

```
$ pm2 start index.js --name selelabot-discord
```
※アプリケーションの名前は何でもいい
