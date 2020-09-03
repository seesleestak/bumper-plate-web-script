const { JSDOM } = require("jsdom");
const axios = require("axios");
const fetch = require("node-fetch");

async function repHandler(url, name, handleError) {
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

async function rogueHandler(url, name, handleError) {
  return fetch(url)
    .then((res) => res.text())
    .then((data) => {
      const dom = new JSDOM(data);
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

async function americanBarbellHandler(url, name, handleError) {
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

module.exports = {
  rogueHandler,
  repHandler,
  americanBarbellHandler,
};
