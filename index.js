'use strict';

const puppeteer = require('puppeteer');
const dataDog = require('./js/DataDog.js');
const FileUtils = require('./js/FileUtils.js');
const LAMBDA_CHROME_PATH = "/var/task/lib/headless-chromium";
const DEFAULT_TIMEOUT = 15000;
const defaultChromeFlags = [
  '--no-sandbox',
  '--disable-gpu',
  '--disable-setuid-sandbox',
  '--single-process',
  '--headless'
];

let instantiated_date = new Date();

exports.handler = (event, context, callback) => {
  (async () => {
    console.log("Lambda handler trigerred. Function instantiated: " + instantiated_date);

    try {
      let envParams = getInitialParameters();
      await performCheck(envParams, timedCallback).then(function () {
        success();
        callback(null, "done.");
      });
    } catch (err) {
      failure();
      callback("Lambda finished with error. Error: " + err);
    }
  })();
};

async function performCheck(params, timedCallback) {
  const startTime = new Date().getTime();
  const browser = await puppeteer.launch({ executablePath: params.chromePath, args: defaultChromeFlags });
  const page = await browser.newPage();

  try {    
    page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT);
    // login page
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto(params.url);
    
    //type credentials and submit
    await page.type('input[name="username"]', params.login);
    await page.type('input[name="password"]', params.password);
    await page.click('button[type="submit"]');
    
    //verify login
    await page.waitForSelector('top-bar[is-logged-in="isLoggedIn"]', { timeout: DEFAULT_TIMEOUT });
  } catch (err) {
    const DEBUG = process.env.DEBUG;
    const BUCKET_NAME = process.env.BUCKET_NAME;
    
    if (DEBUG && BUCKET_NAME) {
      console.log("Taking screenshot into: ", BUCKET_NAME);
      let buffer = await page.screenshot();
      FileUtils.uploadToS3(buffer, BUCKET_NAME);
      buffer=null;      
    }

    throw 'Page scrapping exception. Error: ' + err;
  } finally {
    if (typeof timedCallback === "function") {
      timedCallback(new Date().getTime() - startTime);
    }

    await browser.close();
  }
};

//We expect following env variables. Please make sure they are set
function getInitialParameters() {
  let failure = false;
  if (!process.env.URL) { console.log('please set environment variable URL'); failure = true; }
  if (!process.env.LOGIN) { console.log('please set environment variable LOGIN'); failure = true; }
  if (!process.env.ENV_TAG) { console.log('please set environment variable ENV_TAG'); failure = true; }
  if (!process.env.PASSWORD) { console.log('please set environment variable PASSWORD'); failure = true; }

  if (failure) {
    throw 'please set required environment variables first: [URL, LOGIN, PASSWORD, ENV_TAG]';
  }

  return {
    url: process.env.URL,
    login: process.env.LOGIN,
    password: process.env.PASSWORD,
    chromePath: process.env.CHROME_PATH || LAMBDA_CHROME_PATH
  }
}

//Send 'Success' to DataDog
function success() {
  dataDog.check('lambda.monitoring.check.monitor', 0);
}

//Send 'Warning' to DataDog
function failure() {
  dataDog.check('lambda.monitoring.check.monitor', 1);
}

function timedCallback(time) {
  console.log("time: " + time + " ms");

  dataDog.gauge('lambda.monitoring.gauge.time', time);
  dataDog.histogram('lambda.monitoring.histogram.time', time);
}
