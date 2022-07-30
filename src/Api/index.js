import { useEffect, useMemo, useState } from 'react';
import axios from "axios";
import useSWR from "swr";
import { gql } from "@apollo/client";
import { getTokens, getWhitelistedTokens } from "../data/Tokens";
import { getInfoTokens, limitDecimals } from '../Helpers';
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { bigNumberify, CHART_PERIODS } from '../Helpers';
import moment from 'moment';

const LOCAL_SERVER_URL = 'http://127.0.0.1:443';
const HOSTING_SERVER_URL = 'http://188.166.209.227:443';
const timezoneOffset = -new Date().getTimezoneOffset() * 60;
const apiKey = 'BQYGEmleXf1Mb2yGGybFph4pQgRh0bD2' // replace this with your API Key

export const avalancheGraphClient = createClient("https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats");

function createClient(uri) {
  return new ApolloClient({
    uri,
    cache: new InMemoryCache(),
  });
}

const calcTime = (secs) => {
  // create Date object for current location
  var d = new Date();

  // convert to msec
  // subtract local time zone offset
  // get UTC time in msec
  var utc = d.getTime() + (d.getTimezoneOffset() * 60000);

  // create new Date object for different city
  // using supplied offset
  var nd = new Date(utc - (1000*(secs + 10 * 60)));

  // return time as a string
  // return "The local time for city"+ city +" is "+ nd.toLocaleString();
  return nd.getFullYear() + '-' + ('0' + (nd.getMonth() + 1)).slice(-2) + '-' + nd.getDate() + 'T' + ('0' + nd.getHours()).slice(-2) + ':' + ('0' + nd.getMinutes()).slice(-2) + ':' + ('0' + nd.getSeconds()).slice(-2) + ".000Z";//format("YYYY-MM-DDTHH:mm:ss") + ".000Z";
}

const calcDate = (days) => {
  // create Date object for current location
  var d = new Date();

  // convert to msec
  // subtract local time zone offset
  // get UTC time in msec
  var utc = d.getTime() + (d.getTimezoneOffset() * 60000);

  // create new Date object for different city
  // using supplied offset
  var nd = new Date(utc - (24 * 60 * 60 * 1000 * days));

  // return time as a string
  // return "The local time for city"+ city +" is "+ nd.toLocaleString();
  return nd.getFullYear() + '-' + ('0' + (nd.getMonth() + 1)).slice(-2) + '-' + nd.getDate();
}

export const getOHLCV = async(baseCurrency, period, quoteCurrency="0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56") => {
  const limit = 10000;
  if(quoteCurrency === baseCurrency){
    quoteCurrency = "0x55d398326f99059fF775485246999027B3197955";
  }
  let from =  "\"" + calcTime(CHART_PERIODS[period]) + "\"";
  quoteCurrency = "\"" + quoteCurrency + "\"";
  baseCurrency =  "\"" + baseCurrency + "\"";
  const to =  "\"" + calcTime(0) + "\"";
  const query = `
  {
    ethereum(network: bsc) {
      dexTrades(
        options: {limit: ${limit}, asc: "timeInterval.minute"}
        time: {since: ${from}, till: ${to}}
        baseCurrency: {is: ${baseCurrency}}
        quoteCurrency: {is: ${quoteCurrency}}
        exchangeAddress: {is: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"}
      ) {
        timeInterval {
          minute(count: 5)
        }
        baseCurrency {
          symbol
          address
        }
        baseAmount
        quoteCurrency {
          symbol
          address
        }
        quoteAmount
        trades: count
        high: quotePrice(calculate: maximum)
        low: quotePrice(calculate: minimum)
        open: minimum(of: block, get: quote_price)
        close: maximum(of: block, get: quote_price)
        tradeAmount(in: USD)
      }
    }
  }
  `;
  const opts = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": "BQYGEmleXf1Mb2yGGybFph4pQgRh0bD2"
    },
    body: JSON.stringify({
        query
    })
  };

  let res = await fetch("https://graphql.bitquery.io/", opts);
  res = await res.json();
  const result = await res?.data?.ethereum?.dexTrades;

  if(result){
    return result.map((price) => {
      return {
        time: Date.parse(price.timeInterval.minute) / 1000 + 2 * timezoneOffset,//Date.parse(price.timeInterval.minute) / 1000,
        high: Number(price.high),
        low: Number(price.low),
        open: Number(price.open),
        close: Number(price.close),
      }
    })
  }
  if(result?.length > 0)
    return result;
  return [];
}

export const getDailyChange = async(baseCurrency) => {
  const from =  "\"" + calcDate(1) + "\"";
  const to =  "\"" + calcDate(0) + "\"";
  baseCurrency = "\"" + baseCurrency + "\"";
  const query = `
  {
    ethereum(network: bsc) {
      dexTrades(
        date: {in: [${from}, ${to}]}
        options: {limitBy: {each: "baseCurrency.address", limit: 2}}
        baseCurrency: {is: ${baseCurrency}}
        quoteCurrency: {is: "0xe9e7cea3dedca5984780bafc599bd69add087d56"}
        exchangeAddress: {is: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"}
      ) {
        quotePrice
        count
        tradeAmount(in: USD)
        date {
          date
        }
        baseCurrency {
          address
          name
        }
        quoteCurrency {
          address
          name
        }
      }
    }
  }
  `;
  const opts = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": "BQYGEmleXf1Mb2yGGybFph4pQgRh0bD2"
    },
    body: JSON.stringify({
        query
    })
  };

  let res = await fetch("https://graphql.bitquery.io/", opts);
  res = await res.json();
  const result = await res?.data?.ethereum?.dexTrades;
  let dailyChange = 0;
  if(result){
    dailyChange = 2 * (result[1].quotePrice - result[0].quotePrice) / (result[1].quotePrice + result[0].quotePrice) * 100;
    return dailyChange.toFixed(2);
  }
  return dailyChange;
}

// export const getOHLCV = async (token) => {
//   const symbol = token !== "BNB" ? token : "WBNB";
//   const headers = {
//     'Content-Type': 'application/json',
//     'Accept': 'application/json',
//   }
//   const res = await axios.post(`${HOSTING_SERVER_URL}/prices`, { symbol }, {
//     headers: headers
//   });
//   let prices = [];
//   if (res.status === 200) {
//     prices = res.data.map((item) => ({
//       time: item.updated_at / 1000 + timezoneOffset,
//       open: Number(item.prices_usd['o']),
//       close: Number(item.prices_usd['c']),
//       high: Number(item.prices_usd['h']),
//       low: Number(item.prices_usd['l'])
//     }))
//   } else {
//     console.log(res.status);
//   }
//   return prices;
// }

export const getTrades = async () => {
  const to =  "\"" + calcDate(0) + "\"";

  const query =`
  {
    ethereum(network: bsc) {
      dexTrades(
        date: {is: ${to}}
        exchangeName: {is: "Pancake"}
        options: {desc: ["volume"] limit: 1000}
        
      ) {
        timeInterval {
          minute(count: 2) 
        }
        baseCurrency {
          symbol
          address
        }
        baseAmount
        quoteCurrency {
          symbol
          address
        }
        quoteAmount
        volume: tradeAmount(in: USD)
        trades: count
        quotePrice
        side
      }
    }
  }
  `;
  const opts = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": "BQYGEmleXf1Mb2yGGybFph4pQgRh0bD2"
    },
    body: JSON.stringify({
        query
    })
  };
  let res = await fetch("https://graphql.bitquery.io/", opts);
  res = await res.json();
  let result = await res?.data?.ethereum?.dexTrades;
  result.sort((item0, item1) => {
    const data0 = item0.timeInterval;
    const data1 = item1.timeInterval;
    const time0 = Date.parse(data0.minute);
    const time1 = Date.parse(data1.minute);
    if (time1 > time0) {
      return 1;
    }
    if (time1 < time0) {
      return -1;
    }
  })

  result = result.filter((item) => {
    const base = item.baseCurrency.symbol;
    const quote = item.quoteCurrency.symbol;
    return (base.includes("BNB") && quote.includes("USD")) || (base.includes("USD") && quote.includes("BNB"))
  })

  if(result) return result;
  
  return [];
}