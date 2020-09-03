const { Telegraf } = require("telegraf");
const fs = require("fs");

const log = require("./utils");
const { repHandler, rogueHandler } = require("./handlers");

require("dotenv").config();

const { TELEGRAM_BOT_TOKEN = "", TELEGRAM_CHAT_ID = "" } = process.env;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const prevStockFile = "./prev-stock.json";
const productMap = {
  ["Rogue 28mm Training Bar"]: {
    url: "https://www.roguefitness.com/rogue-28mm-training-bar",
    handler: async (url, name) => rogueHandler(url, name, handleError),
  },
  ["Rogue 28mm IWF Olympic Weightlifting Bar"]: {
    url: "https://www.roguefitness.com/rogue-iwf-olympic-wl-bar-w-center-knurl-bright-zinc",
    handler: async (url, name) => rogueHandler(url, name, handleError),
  },
  ["Rogue KG Change Plates"]: {
    url: "https://www.roguefitness.com/rogue-kg-change-plates",
    handler: async (url, name) => rogueHandler(url, name, handleError),
  },
  ["Rep Fitness KG Change Plates"]: {
    url: "https://www.repfitness.com/rep-kg-change-plates",
    handler: async (url, name) => repHandler(url, name, handleError),
  },
  ["Rogue S-1 Squat Stand"]: {
    url: "https://www.roguefitness.com/rogue-s-1-squat-stand-2-0",
    handler: async (url, name) => rogueHandler(url, name, handleError),
  },
  ["Rogue Echo Squat Stand"]: {
    url: "https://www.roguefitness.com/rogue-echo-squat-stand-2-0",
    handler: async (url, name) => rogueHandler(url, name, handleError),
  }
};

async function handleError(e, type) {
  log(`${type} ERROR:`, e);
  await bot.telegram.sendMessage(
    TELEGRAM_CHAT_ID,
    `<code>${e}</code>

<i>In ${type} handler</i>`,
    {
      parse_mode: "HTML",
    }
  );
}

async function sendStatusMessage() {
  const message = `Still alive...
Currently watching the following products:
`;
  const productList = Object.keys(productMap).reduce((acc, item) => {
    return acc.concat(`- <a href="${productMap[item].url}">${item}</a>
`);
  }, "");

  await bot.telegram.sendMessage(
    TELEGRAM_CHAT_ID,
    message.concat(productList),
    {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }
  );
}

async function sendStockMessage(list, type, url) {
  log("list --- ", list);
  const title = `<b>${type} Bumper Plates <u>IN STOCK</u>:</b>

`;
  const stockList = list.reduce((acc, item) => {
    return acc.concat(`- ${item}
`);
  }, "");
  const link = `
<a href="${url}">Go to product page</a>`;
  const copy = title.concat(stockList).concat(link);

  await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, copy, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  log("Stock message sent!");
}

async function writePrevStock(name, stocklist, prevStock) {
  const updatedStock = { ...prevStock, [name]: stocklist };
  await fs.writeFileSync(
    prevStockFile,
    JSON.stringify(updatedStock, null, 2),
    () => null
  );
}

async function main() {
  let prevStock = null;
  try {
    prevStock = JSON.parse(await fs.readFileSync(prevStockFile, "utf8"));
  } catch (e) {
    prevStock = {};
  }

  const date = new Date();
  if (
    date.getDay() === 1 &&
    date.getHours() === 15 &&
    date.getMinutes() === 0
  ) {
    await sendStatusMessage();
  }

  await Promise.allSettled(
    Object.keys(productMap).map(async (name) => {
      const { handler, url } = productMap[name];

      log(`Getting ${name} stocklist...`);
      const stocklist = await handler(url, name);
      // Only send message if there is something in stock and the stock status has changed
      if (
        stocklist.length > 0 &&
        JSON.stringify((prevStock[name] || []).sort()) !==
          JSON.stringify(stocklist.sort())
      ) {
        await writePrevStock(name, stocklist, prevStock);
        await sendStockMessage(stocklist, name, url);
      }
    })
  );
}

main();

module.exports = {
  sendStatusMessage,
}
