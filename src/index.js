const { Telegraf } = require("telegraf");
const fs = require("fs");

const log = require("./utils");
const { rogueHandler } = require("./handlers");

require("dotenv").config();

const { TELEGRAM_BOT_TOKEN = "", TELEGRAM_CHAT_ID = "" } = process.env;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const prevStockFile = "./prev-stock.json";
const productMap = {
  ["Rogue KG Change Plates"]: {
    url: "https://www.roguefitness.com/rogue-kg-change-plates",
    handler: async (url, name) => rogueHandler(url, name, handleError),
  },
  ["Rogue S-1 Squat Stand"]: {
    url: "https://www.roguefitness.com/rogue-s-1-squat-stand-2-0",
    handler: async (url, name) => rogueHandler(url, name, handleError),
  },
  ["Rogue S-2 Squat Stand"]: {
    url: "https://www.roguefitness.com/rogue-s2-squat-stand-2-0",
    handler: async (url, name) => rogueHandler(url, name, handleError),
  },
  ["Rogue Echo Squat Stand"]: {
    url: "https://www.roguefitness.com/rogue-echo-squat-stand-2-0",
    handler: async (url, name) => rogueHandler(url, name, handleError),
  },
  ["Rogue S-4 Squat Stand (Independent)"]: {
    url: "https://www.roguefitness.com/rogue-s-4-squat-stand-2",
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
  let title = ''
  if (list.length === 0) {
    title = `<b>${type} <u>OUT OF STOCK</u></b>`
  } else {
    title = `<b>${type} <u>IN STOCK</u>:</b>

`;
  }
  const stockList = list.reduce((acc, item) => {
    return acc.concat(`- ${item}
`);
  }, "");
  const link = `
<a href="${url}">Go to product page</a>`;

  let copy = title;
  if (list.length !== 0) {
    copy = copy.concat(stockList)
  }
  copy = copy.concat(link)

  await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, copy, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  log(`${type} stock message sent!`);
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
      log("stocklist --- ", name, stocklist);

      // Only send message if there is something in stock and the stock status has changed
      if (
        JSON.stringify((prevStock[name] || []).sort()) !==
          JSON.stringify(stocklist.sort())
      ) {
        await writePrevStock(name, stocklist, prevStock);
        await sendStockMessage(stocklist, name, url);
      }
    })
  );
}

module.exports = {
  sendStatusMessage,
  main,
};
