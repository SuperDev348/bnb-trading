import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createChart } from "krasulya-lightweight-charts";
import {
    USD_DECIMALS,
    INCREASE,
    SWAP,
    CHART_PERIODS,
    formatDateTime,
    MAINNET,
    useLocalStorageSerializeKey,
    formatAmount,
    getLiquidationPrice
} from "../../Helpers";
import { getDailyChange, getOHLCV } from '../../Api';
import cx from "classnames";
import Tab from "../Tab/Tab";
import { getTokens, getToken } from "../../data/Tokens";
import ChartTokenSelector from "./ChartTokenSelector";
import { getContract } from '../../Addresses';

const DEFAULT_PERIOD = "4h";
const timezoneOffset = -new Date().getTimezoneOffset() * 60;
const PRICE_LINE_TEXT_WIDTH = 15;

//https://graphql.bitquery.io/ide/IUcXyXiRy7
const toFixedNumbers = 2;

export function getChartToken(swapOption, fromToken, toToken, chainId) {
  if (!fromToken || !toToken) {
    return;
  }

  if (swapOption !== SWAP) {
    return toToken;
  }

  if (fromToken.isUsdg && toToken.isUsdg) {
    return getTokens(chainId).find((t) => t.isStable);
  }
  if (fromToken.isUsdg) {
    return toToken;
  }
  if (toToken.isUsdg) {
    return fromToken;
  }

  if (fromToken.isStable && toToken.isStable) {
    return toToken;
  }
  if (fromToken.isStable) {
    return toToken;
  }
  if (toToken.isStable) {
    return fromToken;
  }

  return toToken;
}


const getSeriesOptions = () => ({
    // https://github.com/tradingview/lightweight-charts/blob/master/docs/area-series.md
    lineColor: "#5472cc",
    topColor: "rgba(49, 69, 131, 0.4)",
    bottomColor: "rgba(42, 64, 103, 0.0)",
    lineWidth: 2,
    priceLineColor: "#3a3e5e",
    downColor: "#fa3c58",
    wickDownColor: "#fa3c58",
    upColor: "#0ecc83",
    wickUpColor: "#0ecc83",
    borderVisible: false,
});

const getChartOptions = (width, height) => ({
    width,
    height,
    layout: {
        backgroundColor: "rgba(255, 255, 255, 0)",
        textColor: "#ccc",
        fontFamily: "Relative",
    },
    localization: {
        // https://github.com/tradingview/lightweight-charts/blob/master/docs/customization.md#time-format
        timeFormatter: (businessDayOrTimestamp) => {
        return formatDateTime(businessDayOrTimestamp - timezoneOffset);
        },
    },
    grid: {
        vertLines: {
        visible: true,
        color: "rgba(35, 38, 59, 1)",
        style: 2,
        },
        horzLines: {
        visible: true,
        color: "rgba(35, 38, 59, 1)",
        style: 2,
        },
    },
    // https://github.com/tradingview/lightweight-charts/blob/master/docs/time-scale.md#time-scale
    timeScale: {
        rightOffset: 5,
        borderVisible: false,
        barSpacing: 5,
        timeVisible: true,
        fixLeftEdge: true,
    },
    // https://github.com/tradingview/lightweight-charts/blob/master/docs/customization.md#price-axis
    priceScale: {
        borderVisible: false,
    },
    crosshair: {
        horzLine: {
        color: "#aaa",
        },
        vertLine: {
        color: "#aaa",
        },
        mode: 0,
    },
});

export default function ExchangeTVChart({
  swapOption,
  fromToken,
  toToken,
  savedShouldShowPositionLines,
  orders,
  positions,
}){
  const [currentChart, setCurrentChart] = useState(null);
  const [currentSeries, setCurrentSeries] = useState(null);
  const [hoveredCandlestick, setHoveredCandlestick] = useState();
  const [chartInited, setChartInited] = useState(false);
  const [priceData, setPriceData] = useState(null);
  const [chartToken, setChartToken] = useState(fromToken);
  const [dailyChange, setDailyChange] = useState(null);

  const ref = useRef(null);
  const chartRef = useRef(null);

  let [period, setPeriod] = useLocalStorageSerializeKey([MAINNET, "Chart-period"], DEFAULT_PERIOD);
  if (!(period in CHART_PERIODS)) {
      period = DEFAULT_PERIOD;
  }

  const currentOrders = useMemo(() => {
    if (swapOption === SWAP || !chartToken) {
      return [];
    }

    return orders.filter((order) => {
      if (order.type === SWAP) {
        // we can't show non-stable to non-stable swap orders with existing charts
        // so to avoid users confusion we'll show only long/short orders
        return false;
      }

      return order.indexToken === chartToken.address;
    });
  }, [orders, chartToken, swapOption]);

  const onCrosshairMove = useCallback(
    (evt) => {
      if (!evt.time) {
        setHoveredCandlestick(null);
        return;
      }

      for (const point of evt.seriesPrices.values()) {
        setHoveredCandlestick((hoveredCandlestick) => {
          if (hoveredCandlestick && hoveredCandlestick.time === evt.time) {
            // rerender optimisations
            return hoveredCandlestick;
          }
          return {
            time: evt.time,
            ...point,
          };
        });
        break;
      }
    },
    [setHoveredCandlestick]
  );

  const scaleChart = useCallback(() => {
      const from = Date.now() / 1000 - (7 * 24 * CHART_PERIODS[period]) / 2 + timezoneOffset;
      const to = Date.now() / 1000 + timezoneOffset;
      currentChart?.timeScale()?.setVisibleRange({ from, to });
  }, [currentChart, period]);
  
  useEffect(() => {
    const init = async() => {
      const prices = await getOHLCV(fromToken?.symbol === "BNB"?getContract(MAINNET, "NATIVE_TOKEN"):fromToken.address, period);
      setPriceData(prices);
      const dailyChange = await getDailyChange(fromToken?.symbol === "BNB"?getContract(MAINNET, "NATIVE_TOKEN"):fromToken.address);
      setDailyChange(dailyChange);
    }
    init()
    const intervalId = setInterval(() => {
      init()
    }, 1000 * 60)
    return () => clearInterval(intervalId)
  }, [fromToken, period])

  useEffect(() => {
    if (!ref.current || !priceData || currentChart) {
      return;
    }
    const chart = createChart(
      chartRef.current,
      getChartOptions(chartRef.current.offsetWidth, chartRef.current.offsetHeight)
    );

    chart.timeScale().applyOptions({secondsVisible: false, timeVisible: true, visible:true})

    chart.subscribeCrosshairMove(onCrosshairMove);

    const series = chart.addCandlestickSeries(getSeriesOptions());

    setCurrentChart(chart);
    setCurrentSeries(series);
  }, [ref, priceData, currentChart, onCrosshairMove]);

  useEffect(() => {
      if (currentSeries && priceData && priceData?.length > 0) {
        currentSeries.setData(priceData);
  
        if (!chartInited) {
          scaleChart();
          setChartInited(true);
        }
      }
  }, [priceData, currentSeries, chartInited, scaleChart]);

  useEffect(() => {
    if (!currentChart) {
      return;
    }
    const resizeChart = () => {
      currentChart.resize(chartRef.current.offsetWidth, chartRef.current.offsetHeight);
    };
    window.addEventListener("resize", resizeChart);
    return () => window.removeEventListener("resize", resizeChart);
  }, [currentChart]);

  useEffect(() => {
    const lines = [];
    if (currentSeries && savedShouldShowPositionLines) {
      if (currentOrders && currentOrders.length > 0) {
        currentOrders.forEach((order) => {
          const indexToken = getToken(MAINNET, order.indexToken);
          let tokenSymbol;
          if (indexToken && indexToken.symbol) {
            tokenSymbol = indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol;
          }
          const title = `${order.type === INCREASE ? "Inc." : "Dec."} ${tokenSymbol} ${
            order.isLong ? "Long" : "Short"
          }`;
          const color = "#3a3e5e";
          lines.push(
            currentSeries.createPriceLine({
              price: parseFloat(formatAmount(order.triggerPrice, USD_DECIMALS, 2)),
              color,
              title: title.padEnd(PRICE_LINE_TEXT_WIDTH, " "),
            })
          );
        });
      }
      if (positions && positions.length > 0) {
        const color = "#3a3e5e";

        positions.forEach((position) => {
          lines.push(
            currentSeries.createPriceLine({
              price: parseFloat(formatAmount(position.averagePrice, USD_DECIMALS, 2)),
              color,
              title: `Open ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"}`.padEnd(
                PRICE_LINE_TEXT_WIDTH,
                " "
              ),
            })
          );

          const liquidationPrice = getLiquidationPrice(position);
          lines.push(
            currentSeries.createPriceLine({
              price: parseFloat(formatAmount(liquidationPrice, USD_DECIMALS, 2)),
              color,
              title: `Liq. ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"}`.padEnd(
                PRICE_LINE_TEXT_WIDTH,
                " "
              ),
            })
          );
        });
      }
    }
    return () => {
      lines.forEach((line) => currentSeries.removePriceLine(line));
    };
  }, [currentOrders, positions, currentSeries, savedShouldShowPositionLines]);

  const candleStatsHtml = useMemo(() => {
    if (!priceData) {
      return null;
    }
    const candlestick = hoveredCandlestick || priceData[priceData.length - 1];
    if (!candlestick) {
      return null;
    }
    const className = cx({
      "ExchangeChart-bottom-stats": true,
      positive: candlestick.open <= candlestick.close,
      negative: candlestick.open > candlestick.close,
      [`length-${String(parseInt(candlestick.close)).length}`]: true,
    });


    return (
      <div className={className}>
        <span className="ExchangeChart-bottom-stats-label">O</span>
        <span className="ExchangeChart-bottom-stats-value">{Number(candlestick?.open)?.toFixed(toFixedNumbers)}</span>
        <span className="ExchangeChart-bottom-stats-label">H</span>
        <span className="ExchangeChart-bottom-stats-value">{Number(candlestick?.high)?.toFixed(toFixedNumbers)}</span>
        <span className="ExchangeChart-bottom-stats-label">L</span>
        <span className="ExchangeChart-bottom-stats-value">{Number(candlestick?.low)?.toFixed(toFixedNumbers)}</span>
        <span className="ExchangeChart-bottom-stats-label">C</span>
        <span className="ExchangeChart-bottom-stats-value">{Number(candlestick?.close)?.toFixed(toFixedNumbers)}</span>
      </div>
    );
  }, [hoveredCandlestick, priceData]);

  let high=null;
  let low=null;
  let deltaPrice=null;
  let delta=null;
  let deltaPercentage=null;
  let deltaPercentageStr=null;

  const now = parseInt(Date.now() / 1000);
  const timeThreshold = now - 24 * 60 * 60;

  let average = 0;
  let cnt = 0;
  let firstPrice;
  let lastPrice;
  if (priceData?.length) {
    let i = priceData.length - 1;

    while (i > 0) {
      const price = priceData[i];
      if (!low) {
        low = price.low;
      }
      if (!high) {
        high = price.high;
      }

      if (price.high > high) {
        high = price.high;
      }
      if (price.low < low) {
        low = price.low;
      }
      i--;
      cnt ++;
      average += price.open;
      deltaPrice = price.open;
      if (price.time < timeThreshold) {
        firstPrice = price.open;
        lastPrice = price.close; //priceData[priceData.length - 1].close;
        break;
      }
    }

  }
  if (cnt) {
    average = average / cnt
  }
  if (deltaPrice && firstPrice && lastPrice) {
    delta = lastPrice - firstPrice;
    deltaPercentage = delta / average * 100;

    if (deltaPercentage > 0) {
      deltaPercentageStr = `+${deltaPercentage.toFixed(4)}%`;
    } else {
      deltaPercentageStr = `${deltaPercentage.toFixed(4)}%`;
    }
    if (deltaPercentage === 0) {
      deltaPercentageStr = "0.00";
    }
  }

  if (!chartToken) {
    return null;
  }

  const onSelectToken = (token) => {
    // const tmp = getTokenInfo(infoTokens, token.address);
    // setChartToken(tmp);
    // setToTokenAddress(swapOption, token.address);
  };

  return (
      <div className="ExchangeChart tv" ref={ref}>
        <div className="ExchangeChart-top App-box App-box-border">
          <div className="ExchangeChart-top-inner">
            <div>
              <div className="ExchangeChart-title">
                <ChartTokenSelector
                  chainId={MAINNET}
                  selectedToken={fromToken}
                  swapOption={swapOption}
                  onSelectToken={onSelectToken}
                  className="chart-token-selector"
                />
              </div>
            </div>
            <div>
              <div className="ExchangeChart-main-price">
                {priceData && priceData[priceData?.length - 1]?.close.toFixed(toFixedNumbers)}
              </div>
              <div className="ExchangeChart-info-label">
                ${priceData && priceData[priceData?.length - 1]?.close.toFixed(toFixedNumbers)}
              </div>
            </div>
            <div>
              <div className="ExchangeChart-info-label">24h Change</div>
              <div className={cx({ positive: dailyChange > 0, negative: dailyChange < 0 })}>
                {!dailyChange && "-"}
                {dailyChange && dailyChange}%
              </div>
            </div>
            <div className="ExchangeChart-additional-info">
              <div className="ExchangeChart-info-label">24h High</div>
              <div>
                {!high && "-"}
                {high && high.toFixed(2)}
              </div>
            </div>
            <div className="ExchangeChart-additional-info">
              <div className="ExchangeChart-info-label">24h Low</div>
              <div>
                {!low && "-"}
                {low && low.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        <div className="ExchangeChart-bottom App-box App-box-border">
          <div className="ExchangeChart-bottom-header">
            <div className="ExchangeChart-bottom-controls">
              <Tab options={Object.keys(CHART_PERIODS)} option={period} setOption={setPeriod} />
            </div>
            {candleStatsHtml}
          </div>
          <div className="ExchangeChart-bottom-content" ref={chartRef}></div>
        </div>
      </div>
  );
}