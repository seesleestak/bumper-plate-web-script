const { JSDOM } = require("jsdom");
const axios = require("axios");
const { Telegraf } = require("telegraf");

require("dotenv").config();

const { TELEGRAM_BOT_TOKEN = "", TELEGRAM_CHAT_ID = "" } = process.env;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const productMap = {
  ["Rep Fitness Competition"]: {
    url:
      "https://www.repfitness.com/bars-plates/olympic-plates/rep-competition-bumper-plates-kg",
    handler: repHandler,
  },
  ["Rogue Training 2.0"]: {
    url: "https://www.roguefitness.com/rogue-kg-training-2-0-plates",
    handler: rogueHandler,
  },
  ["Rogue Training Striped"]: {
    url: "https://www.roguefitness.com/rogue-black-training-kg-striped-plates",
    handler: rogueHandler,
  },
  ["American Barbell"]: {
    url:
      "https://americanbarbell.com/collections/weights/products/american-barbell-black-kg-sport-bumper-plates",
    handler: americanBarbellHandler,
  },
};

function log(...args) {
  console.log(new Date().toUTCString(), "|", ...args);
}

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

async function repHandler(url, name) {
  return axios
    .get(url)
    .then((response) => {
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      const stockClass = document.getElementsByClassName("out-of-stock")[0];
      if (!stockClass) {
        return ["In stock on site!"];
      }
      return [];
    })
    .catch((e) => handleError(e, name));
}

async function rogueHandler(url, name) {
  return axios
    .get(url)
    .then((response) => {
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      const rows = document.getElementsByClassName("grouped-item");
      const rowList = [...rows];

      const stockList = rowList.reduce((acc, row) => {
        const product = row.getElementsByClassName("item-name")[0].innerHTML;
        const outOfStock = row.getElementsByClassName("bin-out-of-stock")[0];

        if (!outOfStock && product) {
          acc.push(product);
        }
        return acc;
      }, []);

      return stockList;
    })
    .catch((e) => handleError(e, name));
}

async function americanBarbellHandler(url, name) {
  return axios
    .get(url)
    .then((response) => {
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      const tableId = "prb_product_table";
      const table = document.getElementById(tableId);
      const rows = table.getElementsByTagName("tr");
      const rowList = [...rows];

      const stockList = rowList.reduce((acc, row) => {
        const cells = row.getElementsByTagName("td");
        const product =
          cells.length > 1 && cells[cells.length - 4].textContent.trim();

        if (
          product &&
          !cells[cells.length - 1].innerHTML
            .trim()
            .toLowerCase()
            .includes("out of stock")
        ) {
          acc.push(product);
        }
        return acc;
      }, []);

      return stockList;
    })
    .catch((e) => handleError(e, name));
}

async function main() {
  const date = new Date();
  if (
    date.getDay() === 1 &&
    date.getHours() === 15 &&
    date.getMinutes() === 0
  ) {
    await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, "Still alive...");
  }

  await Promise.allSettled(
    Object.keys(productMap).map(async (name) => {
      const { handler, url } = productMap[name];
      log(`Getting ${name} stocklist...`);
      const stocklist = await handler(url, name);
      if (stocklist.length > 0) {
        await sendStockMessage(stocklist, name, url);
      }
    })
  );
}

main();
