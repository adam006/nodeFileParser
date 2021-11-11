// import fs from 'fs';

const v8 = require("v8");
const fs = require("fs");
const util = require("util");
const { EOL } = require("os");
const parse = require("csv-parse");
const config = require("./config.json");
// const parse = require("csv-parse/lib/sync");

run().then(r => console.log('done'));

async function run () {
  let customers = await getCustomerList();

  const readDir = util.promisify(fs.readdir);
  let files = await readDir(config.pdfFilesPath);

  let csv = buildCsvHeader();
  let map = mapAndGroupFiles(files);
  for (let [key, value] of map) {
    let sorted = sortFilesInGroup(value);
    let customer = customers.find((s) => s.Acct === key);
    csv += buildCsvRow(customer, sorted);
  }
  const writeFile = util.promisify(fs.writeFile);
  await writeFile(config.outputPath, csv);
};

function buildCsvRow(customer, pages) {
  let row = customer.Acct + ",";
  row += pages.length + ",";
  row += `"${customer.CustName}",`;
  row += `"${customer.CAREOF}",`;
  row += `"${customer.ADDRESS}",`;
  row += `"${customer.ADDRESS2}",`;
  row += `"${customer.CustCityStateZip}",`;
  for (let i = 0; i < pages.length; i++) {
    row += pages[i];
    if (i < pages.length - 1) row += ",";
  }
  row += EOL;
  return row;
}

function sortFilesInGroup(mapArray) {
  let map = new Map();
  for (let entry of mapArray) {
    let num = entry.substring(0, entry.indexOf("-"));
    map.set(parseInt(num), entry);
  }
  map = sortMap(map);
  return Array.from(map.values());
}

function buildCsvHeader() {
  let header = "";
  header += "Contract,";
  header += "Total Pages,";
  header += "CustName,";
  header += "CAREOF,";
  header += "Address,";
  header += "Address2,";
  header += "CustCityStateZip" + EOL;
  return header;
}

async function getCustomerList() {
  const readFile = util.promisify(fs.readFile);
  let customers = await readFile(
    config.customerList,
    "utf-8"
  );
  const parser = util.promisify(parse);
  let parsed =  await parser(customers, {
    columns: true,
    skip_empty_lines: true
  });
  return parsed;
}

function mapAndGroupFiles(files) {
  let map = new Map();

  files
    .filter((file) => file.endsWith(".pdf"))
    .map((file) => {
      let key = file.substring(
        nthOccurrance(file, "_", 2) + 1,
        nthOccurrance(file, "_", 3)
      );

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(file);
    });
  return map;
}

function nthOccurrance(source, char, nth) {
  if (nth === 1) return source.indexOf(char);
  let index = source.indexOf(char) + 1;
  let count = 1;
  while (count < nth && index < source.length) {
    if (source[index] === char) count++;
    if (count === nth) return index;
    index++;
  }
  return -1;
}

function sortObj(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = obj[key];
      return result;
    });
}

function sortMap(map) {
  let sorted = Array.from(map.keys()).sort((a, b) => a - b);
  let map2 = new Map();
  for (let entry of sorted) {
    map2.set(entry, map.get(entry));
  }
  return map2;
}
