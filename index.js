const { JSDOM } = require("jsdom");
const axios = require("axios");
const { Telegraf } = require("telegraf");

require('dotenv').config()

const {
  TELEGRAM_BOT_TOKEN = "",
  TELEGRAM_CHAT_ID = "",
  DRY_RUN = false,
} = process.env;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Check every 10 min
const interval = 600000;

const url =
  "https://americanbarbell.com/collections/weights/products/american-barbell-black-kg-sport-bumper-plates";

function log(...args) {
  console.log(new Date().toUTCString(), ...args);
}

function getCopy(list) {
  const title = `<b>Bumper Plates <u>IN STOCK</u>:</b>

`;
  const stockList = list.reduce((acc, item) => {
    return acc.concat(`- ${item}
`);
  }, "");
  const link = `
<a href="${url}">Go to product page</a>`;
  return title.concat(stockList).concat(link);
}

async function getStockList() {
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
    .catch((e) => {
      log("ERROR:", e);
      return [];
    });
}

function main() {
  setInterval(async () => {
    log("Getting stocklist...");
    const list = await getStockList();
    log("list --- ", list);
    if (list.length > 0) {
      if (!DRY_RUN) {
        const mainMsg = await bot.telegram.sendMessage(
          TELEGRAM_CHAT_ID,
          getCopy(list),
          {
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }
        );
        log("mainMsg --- ", mainMsg);
      }
    }
  }, interval);
}

main();
