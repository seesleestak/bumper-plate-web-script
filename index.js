const { JSDOM } = require("jsdom");
const axios = require("axios");
const { Telegraf } = require("telegraf");

require("dotenv").config();

const { TELEGRAM_BOT_TOKEN = "", TELEGRAM_CHAT_ID = "" } = process.env;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const rogueHgUrl = "https://www.roguefitness.com/kg-rogue-bumpers";
const rogueTrainingPlatesUrl =
  "https://www.roguefitness.com/rogue-kg-training-2-0-plates";
const americanBarbellUrl =
  "https://americanbarbell.com/collections/weights/products/american-barbell-black-kg-sport-bumper-plates";

function log(...args) {
  console.log(new Date().toUTCString(), "|", ...args);
}

async function handleError(e, type) {
  log(`${type} ERROR:`, e);
  await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, `<code>${e}</code>`, {
    parse_mode: "HTML",
  });
  return [];
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

  const mainMsg = await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, copy, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  log("mainMsg --- ", mainMsg);
}

async function getRogueStockList() {
  return axios
    .get(rogueHgUrl)
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
    .catch((e) => handleError(e, "Rogue Fitness"));
}

async function getAmericanBarbellStocklist() {
  return axios
    .get(americanBarbellUrl)
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
    .catch((e) => handleError(e, "American Barbell"));
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

  log("Getting American Barbell stocklist...");
  const abStocklist = await getAmericanBarbellStocklist();
  if (abStocklist.length > 0) {
    await sendStockMessage(abStocklist, "American Barbell", americanBarbellUrl);
  }

  log("Getting Rogue HG stocklist...");
  const rogueHgStocklist = await getRogueStockList();
  if (rogueHgStocklist.length > 0) {
    await sendStockMessage(rogueHgStocklist, "Rogue HG", rogueHgUrl);
  }

  log("Getting Rogue Training stocklist...");
  const rogueTrainingStocklist = await getRogueStockList();
  if (rogueTrainingStocklist.length > 0) {
    await sendStockMessage(
      rogueTrainingStocklist,
      "Rogue Training",
      rogueTrainingPlatesUrl
    );
  }
}

main();
