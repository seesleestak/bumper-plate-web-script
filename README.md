# kg-bumper-stocklist

A script to scrape the [American Barbell](https://americanbarbell.com/) website to check for bumper plate stock and send notifications via a [Telegram](https://telegram.org/) bot.

## Getting Started

Create a `.env` file with the following pieces of info:

```bash
TELEGRAM_CHAT_ID=<your-chat-id>
TELEGRAM_BOT_TOKEN=<your-bot-token>
```

Then install dependencies and start it up:

```bash
npm i && npm start
```

The script will check the webpage for stock changes every 10 minutes. If anything comes back into stock, the your Telegram bot will message you.
