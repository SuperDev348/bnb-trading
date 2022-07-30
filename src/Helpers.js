
import React, { useState, useRef, useEffect, useCallback } from "react";
import { BigNumber, ethers } from "ethers";
import { useLocalStorage } from "react-use";
import _ from "lodash";
import { getContract } from "./Addresses";
import { format as formatDateFn } from "date-fns";
import { useWeb3React, UnsupportedChainIdError } from "@web3-react/core";
import useSWR from "swr";
import { getWhitelistedTokens, isValidToken } from "./data/Tokens";
import { InjectedConnector } from "@web3-react/injected-connector";
import {
  WalletConnectConnector,
  UserRejectedRequestError as UserRejectedRequestErrorWalletConnect,
} from "@web3-react/walletconnect-connector";

import { toast } from "react-toastify";
var bigInt = require("big-integer");

export const MAINNET = 56;
export const SWAP = "Swap";
export const INCREASE = "Increase";
export const DECREASE = "Decrease";
export const LONG = "Long";
export const SHORT = "Short";

export const MARKET = "Market";
export const LIMIT = "Limit";
export const STOP = "Stop";
export const LEVERAGE_ORDER_OPTIONS = [MARKET, LIMIT];
export const SWAP_ORDER_OPTIONS = [MARKET, LIMIT];

export const USDG_ADDRESS = getContract(MAINNET, "USDG");
export const USD_DECIMALS = 30;
export const BASIS_POINTS_DIVISOR = 10000;
export const MAX_PRICE_DEVIATION_BASIS_POINTS = 250;
export const PRECISION = expandDecimals(1, 30);

export const TAX_BASIS_POINTS = 50;
export const STABLE_TAX_BASIS_POINTS = 5;
export const MINT_BURN_FEE_BASIS_POINTS = 25;
export const SWAP_FEE_BASIS_POINTS = 30;
export const STABLE_SWAP_FEE_BASIS_POINTS = 1;
export const MARGIN_FEE_BASIS_POINTS = 10;

export const DEFAULT_MAX_USDG_AMOUNT = expandDecimals(200 * 1000 * 1000, 18);

export const LIQUIDATION_FEE = expandDecimals(5, USD_DECIMALS);

export const GLP_COOLDOWN_DURATION = 15 * 60;
export const THRESHOLD_REDEMPTION_VALUE = expandDecimals(993, 27); // 0.993
export const FUNDING_RATE_PRECISION = 1000000;
export const MAX_LEVERAGE = 100 * 10000;

export const SLIPPAGE_BPS_KEY = "Exchange-swap-slippage-basis-points-v3";
export const IS_PNL_IN_LEVERAGE_KEY = "Exchange-swap-is-pnl-in-leverage";
export const SHOW_PNL_AFTER_FEES_KEY = "Exchange-swap-show-pnl-after-fees";
export const DISABLE_ORDER_VALIDATION_KEY = "disable-order-validation";
export const SHOULD_SHOW_POSITION_LINES_KEY = "Exchange-swap-should-show-position-lines";
export const REFERRAL_CODE_KEY = "GMX-referralCode";
export const REFERRAL_CODE_QUERY_PARAM = "ref";
export const REFERRALS_SELECTED_TAB_KEY = "Referrals-selected-tab";
export const MAX_REFERRAL_CODE_LENGTH = 20;

const SELECTED_NETWORK_LOCAL_STORAGE_KEY = "SELECTED_NETWORK";

export const WALLET_CONNECT_LOCALSTORAGE_KEY = "walletconnect";
export const WALLET_LINK_LOCALSTORAGE_PREFIX = "-walletlink";
export const SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY = "eagerconnect";
export const CURRENT_PROVIDER_LOCALSTORAGE_KEY = "currentprovider";

export const DEFAULT_SLIPPAGE_AMOUNT = 30;

export const DEFAULT_CHAIN_ID = MAINNET;
export const CHAIN_ID = DEFAULT_CHAIN_ID;

export const AVALANCHE = 43114;
export const ARBITRUM = 42161;

const CHAIN_NAMES_MAP = {
  [MAINNET]: "BSC",
  [ARBITRUM]: "Arbitrum",
  [AVALANCHE]: "Avalanche",
};

export const CHART_PERIODS = {
    "5m": 60 * 5,
    "15m": 60 * 15,
    "1h": 60 * 60,
    "4h": 60 * 60 * 4,
    "1d": 60 * 60 * 24,
};

export const BSC_RPC_PROVIDERS = [
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
    "https://bsc-dataseed1.ninicoin.io",
    "https://bsc-dataseed2.defibit.io",
    "https://bsc-dataseed3.defibit.io",
    "https://bsc-dataseed4.defibit.io",
    "https://bsc-dataseed2.ninicoin.io",
    "https://bsc-dataseed3.ninicoin.io",
    "https://bsc-dataseed4.ninicoin.io",
    "https://bsc-dataseed1.binance.org",
    "https://bsc-dataseed2.binance.org",
    "https://bsc-dataseed3.binance.org",
    "https://bsc-dataseed4.binance.org",
];

const FALLBACK_PROVIDERS = {
    [MAINNET]: ["https://avax-mainnet.gateway.pokt.network/v1/lb/626f37766c499d003aada23b"],
};

const ARBITRUM_RPC_PROVIDERS = ["https://arb1.arbitrum.io/rpc"];
const AVALANCHE_RPC_PROVIDERS = ["https://api.avax.network/ext/bc/C/rpc"];

const { AddressZero } = ethers.constants;
const RPC_PROVIDERS = {
    [MAINNET]: BSC_RPC_PROVIDERS,
};
const supportedChainIds = [MAINNET];
const injectedConnector = new InjectedConnector({
  supportedChainIds,
});

const NETWORK_METADATA = {
  [MAINNET]: {
    chainId: "0x" + MAINNET.toString(16),
    chainName: "BSC",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: BSC_RPC_PROVIDERS,
    blockExplorerUrls: ["https://bscscan.com"],
  },
  [ARBITRUM]: {
    chainId: "0x" + ARBITRUM.toString(16),
    chainName: "Arbitrum",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ARBITRUM_RPC_PROVIDERS,
    blockExplorerUrls: [getExplorerUrl(ARBITRUM)],
  },
  [AVALANCHE]: {
    chainId: "0x" + AVALANCHE.toString(16),
    chainName: "Avalanche",
    nativeCurrency: {
      name: "AVAX",
      symbol: "AVAX",
      decimals: 18,
    },
    rpcUrls: AVALANCHE_RPC_PROVIDERS,
    blockExplorerUrls: [getExplorerUrl(AVALANCHE)],
  },
};

export function bigNumberify(n) {
    return ethers.BigNumber.from(n);
}

export function getExplorerUrl(chainId) {
  if (chainId === 3) {
    return "https://ropsten.etherscan.io/";
  } else if (chainId === 42) {
    return "https://kovan.etherscan.io/";
  } else if (chainId === MAINNET) {
    return "https://bscscan.com/";
  }
  return "https://etherscan.io/";
}

export function expandDecimals(n, decimals) {
    return bigNumberify(n).mul(bigNumberify(10).pow(decimals));
}
export function getProvider(library, chainId) {
    let provider;
    if (library) {
      return library.getSigner();
    }
    provider = _.sample(RPC_PROVIDERS[chainId]);
    return new ethers.providers.StaticJsonRpcProvider(provider, { chainId });
}

export const getContractCall = ({ provider, contractInfo, arg0, arg1, method, params, additionalArgs, onError }) => {
    if (ethers.utils.isAddress(arg0)) {
      const address = arg0;
      const contract = new ethers.Contract(address, contractInfo.abi, provider);
  
      if (additionalArgs) {
        return contract[method](...params.concat(additionalArgs));
      }
      return contract[method](...params);
    }
  
    if (!provider) {
      return;
    }
  
    return provider[method](arg1, ...params);
};

export function getFallbackProvider(chainId) {
    if (!FALLBACK_PROVIDERS[chainId]) {
      return;
    }
  
    const provider = _.sample(FALLBACK_PROVIDERS[chainId]);
    return new ethers.providers.StaticJsonRpcProvider(provider, { chainId });
}

export const fetcher = (library, contractInfo, additionalArgs) => (...args) => {
    // eslint-disable-next-line
    const [id, chainId, arg0, arg1, ...params] = args;
    const provider = getProvider(library, chainId);
  
    const method = ethers.utils.isAddress(arg0) ? arg1 : arg0;
  
    const contractCall = getContractCall({
      provider,
      contractInfo,
      arg0,
      arg1,
      method,
      params,
      additionalArgs,
    })
  
    let shouldCallFallback = true
  
    const handleFallback = async (resolve, reject, error) => {
      if (!shouldCallFallback) {
        return
      }
      // prevent fallback from being called twice
      shouldCallFallback = false
  
      const fallbackProvider = getFallbackProvider(chainId)
      if (!fallbackProvider) {
        reject(error)
        return
      }
  
      const fallbackContractCall = getContractCall({
        provider: fallbackProvider,
        contractInfo,
        arg0,
        arg1,
        method,
        params,
        additionalArgs,
      })
  
      fallbackContractCall.then((result) => resolve(result)).catch((e) => {
        console.error("fallback fetcher error", id, contractInfo.contractName, method, e);
        reject(e)
      })
    }
  
    return new Promise(async (resolve, reject) => {
      contractCall.then((result) => {
        shouldCallFallback = false
        resolve(result)
      }).catch((e) => {
        console.error("fetcher error", id, contractInfo.contractName, method, e);
        handleFallback(resolve, reject, e)
      })
  
      setTimeout(() => {
        handleFallback(resolve, reject, "contractCall timeout")
      }, 2000)
    })
};

export function getServerBaseUrl(chainId) {
    if (!chainId) {
      throw new Error("chainId is not provided");
    }
    if (document.location.hostname.includes("deploy-preview")) {
      const fromLocalStorage = localStorage.getItem("SERVER_BASE_URL");
      if (fromLocalStorage) {
        return fromLocalStorage;
      }
    }
    if (chainId === MAINNET) {
      return "https://gambit-server-staging.uc.r.appspot.com";
    }
    return "https://gmx-server-mainnet.uw.r.appspot.com";
}

export function getServerUrl(chainId, path) {
    return `${getServerBaseUrl(chainId)}${path}`;
}

export const getTokenInfo = (infoTokens, tokenAddress, replaceNative, nativeTokenAddress) => {
    if (replaceNative && tokenAddress === nativeTokenAddress) {
      return infoTokens[AddressZero];
    }
    return infoTokens[tokenAddress];
};


export function useLocalStorageByChainId(chainId, key, defaultValue) {
    const [internalValue, setInternalValue] = useLocalStorage(key, {});
  
    const setValue = useCallback(
      (value) => {
        setInternalValue((internalValue) => {
          if (typeof value === "function") {
            value = value(internalValue[chainId] || defaultValue);
          }
          const newInternalValue = {
            ...internalValue,
            [chainId]: value,
          };
          return newInternalValue;
        });
      },
      [chainId, setInternalValue, defaultValue]
    );
  
    let value;
    if (chainId in internalValue) {
      value = internalValue[chainId];
    } else {
      value = defaultValue;
    }
  
    return [value, setValue];
}


export function setTokenUsingIndexPrices(token, indexPrices, nativeTokenAddress) {
    if (!indexPrices) {
      return;
    }
  
    const tokenAddress = token.isNative ? nativeTokenAddress : token.address;
  
    const indexPrice = indexPrices[tokenAddress];
    if (!indexPrice) {
      return;
    }
  
    const indexPriceBn = bigNumberify(indexPrice);
    if (indexPriceBn.eq(0)) {
      return;
    }
  
    const spread = token.maxPrice.sub(token.minPrice);
    const spreadBps = spread.mul(BASIS_POINTS_DIVISOR).div(token.maxPrice);
  
    if (spreadBps.gt(MAX_PRICE_DEVIATION_BASIS_POINTS - 50)) {
      // only set one of the values as there will be a spread between the index price and the Chainlink price
      if (indexPriceBn.gt(token.minPrimaryPrice)) {
        token.maxPrice = indexPriceBn;
      } else {
        token.minPrice = indexPriceBn;
      }
      return;
    }
  
    const halfSpreadBps = spreadBps.div(2).toNumber();
    token.maxPrice = indexPriceBn.mul(BASIS_POINTS_DIVISOR + halfSpreadBps).div(BASIS_POINTS_DIVISOR);
    token.minPrice = indexPriceBn.mul(BASIS_POINTS_DIVISOR - halfSpreadBps).div(BASIS_POINTS_DIVISOR);
}

export function getInfoTokens(
    tokens,
    tokenBalances,
    whitelistedTokens,
    fundingRateInfo,
    vaultPropsLength,
  ) {
    if (!vaultPropsLength) {
      vaultPropsLength = 15;
    }
    const fundingRatePropsLength = 2;
    const infoTokens = {};
  
    for (let i = 0; i < tokens.length; i++) {
      const token = JSON.parse(JSON.stringify(tokens[i]));
      if (tokenBalances) {
        token.balance = tokenBalances[i];
      }
      if (token.address === USDG_ADDRESS) {
        token.minPrice = expandDecimals(1, USD_DECIMALS);
        token.maxPrice = expandDecimals(1, USD_DECIMALS);
      }
      infoTokens[token.address] = token;
    }
  
    for (let i = 0; i < whitelistedTokens.length; i++) {
      const token = JSON.parse(JSON.stringify(whitelistedTokens[i]));
      if (fundingRateInfo) {
        token.fundingRate = fundingRateInfo[i * fundingRatePropsLength];
        token.cumulativeFundingRate = fundingRateInfo[i * fundingRatePropsLength + 1];
      }
  
      if (infoTokens[token.address]) {
        token.balance = infoTokens[token.address].balance;
      }
  
      infoTokens[token.address] = token;
    }
  
    return infoTokens;
}

export function formatDateTime(time) {
  return formatDateFn(time * 1000, "dd MMM yyyy, h:mm a");
}

export function useLocalStorageSerializeKey(key, value, opts) {
  key = JSON.stringify(key);
  return useLocalStorage(key, value, opts);
}

export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function sleep(ms) {
  return new Promise((resolve) => resolve(), ms);
}

export const limitDecimals = (amount, maxDecimals) => {
  let amountStr = amount.toString();
  if (maxDecimals === undefined) {
    return amountStr;
  }
  if (maxDecimals === 0) {
    return amountStr.split(".")[0];
  }
  const dotIndex = amountStr.indexOf(".");
  if (dotIndex !== -1) {
    let decimals = amountStr.length - dotIndex - 1;
    if (decimals > maxDecimals) {
      amountStr = amountStr.substr(0, amountStr.length - (decimals - maxDecimals));
    }
  }
  return amountStr;
};

export const padDecimals = (amount, minDecimals) => {
  let amountStr = amount.toString();
  const dotIndex = amountStr.indexOf(".");
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1;
    if (decimals < minDecimals) {
      amountStr = amountStr.padEnd(amountStr.length + (minDecimals - decimals), "0");
    }
  } else {
    amountStr = amountStr + ".0000";
  }
  return amountStr;
};

export function numberWithCommas(x) {
  if (!x) {
    return "...";
  }
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export const formatAmount = (val, tokenDecimals, displayDecimals, useCommas, defaultValue) => {
  const amount = bigNumberify(val);
  if (!defaultValue) {
    defaultValue = "...";
  }
  if (amount === undefined || amount.toString().length === 0) {
    return defaultValue;
  }
  if (displayDecimals === undefined) {
    displayDecimals = 4;
  }
  let amountStr = ethers.utils.formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  if (displayDecimals !== 0) {
    amountStr = padDecimals(amountStr, displayDecimals);
  }
  if (useCommas) {
    return numberWithCommas(amountStr);
  }
  return amountStr;
};

export function getLiquidationPriceFromDelta({ liquidationAmount, size, collateral, averagePrice, isLong }) {
  if (!size || size.eq(0)) {
    return;
  }

  if (liquidationAmount.gt(collateral)) {
    const liquidationDelta = liquidationAmount.sub(collateral);
    const priceDelta = liquidationDelta.mul(averagePrice).div(size);
    return isLong ? averagePrice.add(priceDelta) : averagePrice.sub(priceDelta);
  }

  const liquidationDelta = collateral.sub(liquidationAmount);
  const priceDelta = liquidationDelta.mul(averagePrice).div(size);

  return isLong ? averagePrice.sub(priceDelta) : averagePrice.add(priceDelta);
}

export function getMarginFee(sizeDelta) {
  if (!sizeDelta) {
    return bigNumberify(0);
  }
  const afterFeeUsd = sizeDelta.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);
  return sizeDelta.sub(afterFeeUsd);
}

export function getLiquidationPrice(data) {
  let {
    isLong,
    size,
    collateral,
    averagePrice,
    entryFundingRate,
    cumulativeFundingRate,
    sizeDelta,
    collateralDelta,
    increaseCollateral,
    increaseSize,
    delta,
    hasProfit,
    includeDelta,
  } = data;
  if (!size || !collateral || !averagePrice) {
    return;
  }

  let nextSize = size ? size : bigNumberify(0);
  let remainingCollateral = collateral;

  if (sizeDelta) {
    if (increaseSize) {
      nextSize = size.add(sizeDelta);
    } else {
      if (sizeDelta.gte(size)) {
        return;
      }
      nextSize = size.sub(sizeDelta);
    }

    if (includeDelta && !hasProfit) {
      const adjustedDelta = sizeDelta.mul(delta).div(size);
      remainingCollateral = remainingCollateral.sub(adjustedDelta);
    }
  }

  if (collateralDelta) {
    if (increaseCollateral) {
      remainingCollateral = remainingCollateral.add(collateralDelta);
    } else {
      if (collateralDelta.gte(remainingCollateral)) {
        return;
      }
      remainingCollateral = remainingCollateral.sub(collateralDelta);
    }
  }

  let positionFee = getMarginFee(size).add(LIQUIDATION_FEE);
  if (entryFundingRate && cumulativeFundingRate) {
    const fundingFee = size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION);
    positionFee = positionFee.add(fundingFee);
  }

  const liquidationPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmount: positionFee,
    size: nextSize,
    collateral: remainingCollateral,
    averagePrice,
    isLong,
  });

  const liquidationPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmount: nextSize.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE),
    size: nextSize,
    collateral: remainingCollateral,
    averagePrice,
    isLong,
  });

  if (!liquidationPriceForFees) {
    return liquidationPriceForMaxLeverage;
  }
  if (!liquidationPriceForMaxLeverage) {
    return liquidationPriceForFees;
  }

  if (isLong) {
    // return the higher price
    return liquidationPriceForFees.gt(liquidationPriceForMaxLeverage)
      ? liquidationPriceForFees
      : liquidationPriceForMaxLeverage;
  }

  // return the lower price
  return liquidationPriceForFees.lt(liquidationPriceForMaxLeverage)
    ? liquidationPriceForFees
    : liquidationPriceForMaxLeverage;
}
export function useChainId() {
  let { chainId } = useWeb3React();

  if (!chainId) {
    const chainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
    if (chainIdFromLocalStorage) {
      chainId = parseInt(chainIdFromLocalStorage);
      if (!chainId) {
        // localstorage value is invalid
        localStorage.removeItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
      }
    }
  }

  if (!chainId || !supportedChainIds.includes(chainId)) {
    chainId = DEFAULT_CHAIN_ID;
  }
  return { chainId };
}

export function deserialize(data) {
  for (const [key, value] of Object.entries(data)) {
    if (value._type === "BigNumber") {
      data[key] = bigNumberify(value.value);
    }
  }
  return data;
}

export function shouldInvertTriggerRatio(tokenA, tokenB) {
  if (tokenB.isStable || tokenB.isUsdg) return true;
  if (tokenB.maxPrice && tokenA.maxPrice && tokenB.maxPrice.lt(tokenA.maxPrice)) return true;
  return false;
}

export function getExchangeRateDisplay(rate, tokenA, tokenB, opts = {}) {
  if (!rate || !tokenA || !tokenB) return "...";
  if (shouldInvertTriggerRatio(tokenA, tokenB)) {
    [tokenA, tokenB] = [tokenB, tokenA];
    rate = PRECISION.mul(PRECISION).div(rate);
  }
  const rateValue = formatAmount(rate, USD_DECIMALS, tokenA.isStable || tokenA.isUsdg ? 2 : 4, true);
  if (opts.omitSymbols) {
    return rateValue;
  }
  return `${rateValue} ${tokenA.symbol} / ${tokenB.symbol}`;
}

export function getExchangeRate(tokenAInfo, tokenBInfo, inverted) {
  if (!tokenAInfo || !tokenAInfo.minPrice || !tokenBInfo || !tokenBInfo.maxPrice) {
    return;
  }
  if (inverted) {
    return tokenAInfo.minPrice.mul(PRECISION).div(tokenBInfo.maxPrice);
  }
  return tokenBInfo.maxPrice.mul(PRECISION).div(tokenAInfo.minPrice);
}

export function getChainName(chainId) {
  return CHAIN_NAMES_MAP[chainId];
}

export function getAccountUrl(chainId, account) {
  if (!account) {
    return getExplorerUrl(chainId);
  }
  return getExplorerUrl(chainId) + "address/" + account;
}

export const helperToast = {
  success: (content) => {
    toast.dismiss();
    toast.success(content);
  },
  error: (content) => {
    toast.dismiss();
    toast.error(content);
  },
};

export const addNetwork = async (metadata) => {
  await window.ethereum.request({ method: "wallet_addEthereumChain", params: [metadata] }).catch();
};

export const switchNetwork = async (chainId, active) => {
  if (!active) {
    // chainId in localStorage allows to switch network even if wallet is not connected
    // or there is no wallet at all
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, chainId);
    document.location.reload();
    return;
  }

  try {
    const chainIdHex = "0x" + chainId.toString(16);
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    helperToast.success("Connected to " + getChainName(chainId));
    return getChainName(chainId);
  } catch (ex) {
    // https://docs.metamask.io/guide/rpc-api.html#other-rpc-methods
    // This error code indicates that the chain has not been added to MetaMask.
    // 4001 error means user has denied the request
    // If the error code is not 4001, then we need to add the network
    if (ex.code !== 4001) {
      return await addNetwork(NETWORK_METADATA[chainId]);
    }

    console.error("error", ex);
  }
};

export function useENS(address) {
  const [ensName, setENSName] = useState();

  useEffect(() => {
    async function resolveENS() {
      if (address) {
        const provider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth");
        const name = await provider.lookupAddress(address.toLowerCase());
        if (name) setENSName(name);
      }
    }
    resolveENS();
  }, [address]);

  return { ensName };
}


export function shortenAddress(address, length) {
  if (!length) {
    return "";
  }
  if (!address) {
    return address;
  }
  if (address.length < 10) {
    return address;
  }
  let left = Math.floor((length - 3) / 2) + 1;
  return address.substring(0, left) + "..." + address.substring(address.length - (length - (left + 3)), address.length);
}


export function clearWalletConnectData() {
  localStorage.removeItem(WALLET_CONNECT_LOCALSTORAGE_KEY);
}

export function clearWalletLinkData() {
  Object.entries(localStorage)
    .map((x) => x[0])
    .filter((x) => x.startsWith(WALLET_LINK_LOCALSTORAGE_PREFIX))
    .map((x) => localStorage.removeItem(x));
}


export function hasMetaMaskWalletExtension() {
  return window.ethereum;
}

export function hasCoinBaseWalletExtension() {
  const { ethereum } = window;

  if (!ethereum?.providers && !ethereum?.isCoinbaseWallet) {
    return false;
  }
  return window.ethereum.isCoinbaseWallet || ethereum.providers.find(({ isCoinbaseWallet }) => isCoinbaseWallet);
}

export function activateInjectedProvider(providerName) {
  const { ethereum } = window;

  if (!ethereum?.providers && !ethereum?.isCoinbaseWallet && !ethereum?.isMetaMask) {
    return undefined;
  }

  let provider;
  if (ethereum?.providers) {
    switch (providerName) {
      case "CoinBase":
        provider = ethereum.providers.find(({ isCoinbaseWallet }) => isCoinbaseWallet);
        break;
      case "MetaMask":
      default:
        provider = ethereum.providers.find(({ isMetaMask }) => isMetaMask);
        break;
    }
  }

  if (provider) {
    ethereum.setSelectedProvider(provider);
  }
}

export function getInjectedConnector() {
  return injectedConnector;
}


const getWalletConnectConnector = () => {
  const chainId = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || DEFAULT_CHAIN_ID;
  return new WalletConnectConnector({
    rpc: {
      [AVALANCHE]: AVALANCHE_RPC_PROVIDERS[0],
      [ARBITRUM]: ARBITRUM_RPC_PROVIDERS[0],
    },
    qrcode: true,
    chainId,
  });
};

export const getWalletConnectHandler = (activate, deactivate, setActivatingConnector) => {
  const fn = async () => {
    const walletConnect = getWalletConnectConnector();
    setActivatingConnector(walletConnect);
    activate(walletConnect, (ex) => {
      if (ex instanceof UnsupportedChainIdError) {
        helperToast.error("Unsupported chain. Switch to Arbitrum network on your wallet and try again");
        console.warn(ex);
      } else if (!(ex instanceof UserRejectedRequestErrorWalletConnect)) {
        helperToast.error(ex.message);
        console.warn(ex);
      }
      clearWalletConnectData();
      deactivate();
    });
  };
  return fn;
};

export const getInjectedHandler = (activate) => {
  const fn = async () => {
    activate(getInjectedConnector(), (e) => {
      const chainId = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || DEFAULT_CHAIN_ID;

      if (e instanceof UnsupportedChainIdError) {
        helperToast.error(
          <div>
            <div>Your wallet is not connected to {getChainName(chainId)}.</div>
            <br />
            <div className="clickable underline margin-bottom" onClick={() => switchNetwork(chainId, true)}>
              Switch to {getChainName(chainId)}
            </div>
            <div className="clickable underline" onClick={() => switchNetwork(chainId, true)}>
              Add {getChainName(chainId)}
            </div>
          </div>
        );
        return;
      }
      const errString = e.message ?? e.toString();
      helperToast.error(errString);
    });
  };
  return fn;
};

export function isMobileDevice(navigator) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export const parseValue = (value, tokenDecimals) => {
  const pValue = parseFloat(value);
  if (isNaN(pValue)) {
    return undefined;
  }
  value = limitDecimals(value, tokenDecimals);
  const amount = ethers.utils.parseUnits(value, tokenDecimals);
  return bigNumberify(amount);
};

export const formatAmountFree = (amount, tokenDecimals, displayDecimals) => {
  if (!amount) {
    return "...";
  }
  let amountStr = ethers.utils.formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  return trimZeroDecimals(amountStr);
};

export const trimZeroDecimals = (amount) => {
  if (parseFloat(amount) === parseInt(amount)) {
    return parseInt(amount).toString();
  }
  return amount;
};


export async function signOrder(makerToken, takerToken, makerAmount, takerAmount, maker) {
    const utils = require("@0x/protocol-utils");
    const contractAddresses = require("@0x/contract-addresses");
    const { MetamaskSubprovider } = require("@0x/subproviders");
  
    const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
    const addresses = contractAddresses.getContractAddressesForChainOrThrow(
      MAINNET
    );
  
    const getFutureExpiryInSeconds = () =>
      Math.floor(Date.now() / 1000 + 300).toString(); // 5 min expiry
  
    let mAddress = makerToken.address;
    if(makerToken.symbol === 'BNB')
      mAddress = getContract(56, "NATIVE_TOKEN");
    let tAddress = takerToken.address;
    if(takerToken.symbol === 'BNB')
      tAddress = getContract(56, "NATIVE_TOKEN");
    
    const makerAmountT = bigInt(Math.ceil(makerAmount * 10 ** makerToken.decimals));
    const takerAmountT = bigInt(Math.ceil(takerAmount * 10 ** takerToken.decimals));
    // Sign order
    const order = new utils.LimitOrder({
      makerToken: mAddress,
      takerToken: tAddress,
      makerAmount: makerAmountT,
      takerAmount: takerAmountT,
      maker: maker,
      sender: NULL_ADDRESS,
      expiry: getFutureExpiryInSeconds(),
      salt: Date.now().toString(),
      chainId: MAINNET,
      verifyingContract: addresses.exchangeProxy
    });
    const supportedProvider = new MetamaskSubprovider(
      window.web3.currentProvider
    );
    const signature = await order.getSignatureWithProviderAsync(
      supportedProvider,
      utils.SignatureType.EIP712 // Optional
    );
  
    const signedOrder = { ...order, signature };
    const resp = await fetch("https://bsc.api.0x.org/orderbook/v1/order", {
      method: "POST",
      body: JSON.stringify(signedOrder),
      headers: {
        "Content-Type": "application/json"
      }
    });
  
    if (resp.status === 200) {
      alert("Successfully posted order to SRA");
    } else {
      const body = await resp.json();
      alert(
        `ERROR(status code ${resp.status}): ${JSON.stringify(body, undefined, 2)}`
      );
    }
}