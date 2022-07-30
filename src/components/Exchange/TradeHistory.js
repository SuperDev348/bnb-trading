import React, { useEffect, useCallback, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import Tooltip from "../../components/Tooltip/Tooltip";

import {
  getExplorerUrl,
  formatDateTime
} from "../../Helpers";
import "./TradeHistory.css";
import { getTrades } from "../../Api";
const timezoneOffset = -new Date().getTimezoneOffset() * 60;

export default function TradeHistory(props) {
  const { account, chainId } = props;
  // const { trades, updateTrades } = useTrades(chainId, account);
  const [trades, setTrades] = useState();

  const getMsg = useCallback(
    (trade) => {
      const tradeData = trade;
      if (tradeData.side === "BUY") {
        return `Buy ${tradeData.baseCurrency.symbol}/${tradeData.quoteCurrency.symbol}`;
      }

      if (tradeData.side === "SELL") {
        return `Sell ${tradeData.quoteCurrency.symbol}/${tradeData.baseCurrency.symbol}`;
      }
    },
    []
  );

  const tradesWithMessages = useMemo(() => {
    if (!trades) {
      return [];
    }
    return trades?.map((trade) => ({
      msg: getMsg(trade),
      ...trade,
    }))
    .filter((trade) => trade.msg);
  }, [trades, getMsg]);


  useEffect(() => {
    const init = async() => {
      const res = await getTrades();
      setTrades(res);
    }
    init();
    const intervalId = setInterval(() => {
      init()
    }, 1000 * 60) // in milliseconds
    return () => clearInterval(intervalId)
  }, [])

  

  return (
    <div className="TradeHistory">
      <div className='tv-container'>
        {tradesWithMessages?.length === 0 && <div className="TradeHistory-row App-box">No trades yet</div>}
        {tradesWithMessages?.length > 0 &&
          tradesWithMessages.map((trade, index) => {
            const tradeData = trade;
            let msg = getMsg(trade);
            if (!msg) {
              return null;
            }

            return (
              <div className="TradeHistory-row App-box App-box-border" key={index}>
                <div>
                  <div className="muted TradeHistory-time">
                    {`${formatDateTime(Date.parse(tradeData.timeInterval.minute) / 1000 + timezoneOffset)} $${tradeData.volume}`}
                    {/* {(!account || account.length === 0) && (
                      <span>
                        {tradeData.volume}
                      </span>
                    )} */}
                  </div>
                  <div className="plain" target="_blank" rel="noopener noreferrer">
                    {msg}
                  </div>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}
