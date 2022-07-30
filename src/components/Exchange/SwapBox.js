import { useEffect, useState } from "react";
import { getTokens, getTokenBySymbol, BEP_20_ABI, TOKEN_ABI } from "../../data/Tokens";
import TokenSelector from "./TokenSelector";
import { 
    MAINNET, 
    SWAP, 
    LONG, 
    SHORT, 
    MARKET, 
    USD_DECIMALS,
    SWAP_ORDER_OPTIONS, 
    LEVERAGE_ORDER_OPTIONS, 
    useLocalStorageSerializeKey,
    useLocalStorageByChainId,
    formatAmount,
    formatAmountFree,
    signOrder
} from "../../Helpers";
import { getConstant } from "../../Constants";
import cx from "classnames";
import Slider, { SliderTooltip } from "rc-slider";
import "rc-slider/assets/index.css";
import { Web3ReactProvider, useWeb3React } from "@web3-react/core";
import ExchangeInfoRow from './ExchangeInfoRow';
import Checkbox from "../Checkbox/Checkbox";
import Tooltip from "../Tooltip/Tooltip";
import Web3 from 'web3';
import Tab from "../Tab/Tab";
import { getContract } from '../../Addresses';
import { ethers } from "ethers";
var math = require('mathjs');

const BigNumber = require('bignumber.js');

const tradingOptions = [
    {
        label: 'Long',
    },
    {
        label: 'Short',
    },
    {
        label: 'Swap',
    }
]

const leverageMarks = {
    2: "2x",
    5: "5x",
    10: "10x",
    15: "15x",
    20: "20x",
    25: "25x",
    30: "30x",
};

export default function SwapBox({
    connectWallet,
    fromToken,
    setFromToken,
    toToken,
    setToToken,
    swapOption,
    setSwapOption
}){
    const qs = require('qs');
    const [fromVisible, setFromVisible] = useState(false);
    const [toVisible, setToVisible] = useState(false);
    const [fromValue, setFromValue] = useState();
    const [toValue, setToValue] = useState();
    const { active, account } = useWeb3React();
    const [gasFee, setGasFee] = useState('');
    const [triggerRatioValue, setTriggerRatioValue] = useState("");
    const [triggerPriceValue, setTriggerPriceValue] = useState("");
    const [toTokenPrice, setToTokenPrice] = useState(0);
    const [fromTokenPrice, setFromTokenPrice] = useState(0);
    const [swapData, setSwapData] = useState([]);
    const [orderBook, setOrderBook] = useState({});
    const [isHover, setHover] = useState(false);
    const [swapPlatform, setSwapPlatform] = useState('');

    const defaultCollateralSymbol = getConstant(MAINNET, "defaultCollateralSymbol");
    const isLong = swapOption === LONG;
    const isShort = swapOption === SHORT;
    const isSwap = swapOption === SWAP;

    let fees;
    let feesUsd;
    let feeBps;
    let swapFees;
    let positionFee;

    let entryMarkPrice;
    let exitMarkPrice;

    const orderOptions = isSwap ? SWAP_ORDER_OPTIONS : LEVERAGE_ORDER_OPTIONS;
    const tokens = getTokens(MAINNET);
    const stableTokens = tokens.filter((token) => token.isStable);

    let [orderOption, setOrderOption] = useLocalStorageSerializeKey([MAINNET, "Order-option"], MARKET);
    const isMarketOrder = orderOption === MARKET;
    const showTriggerPriceSection = !isSwap && !isMarketOrder;
    const showTriggerRatioSection = isSwap && !isMarketOrder
    
    // const triggerPriceUsd = isMarketOrder ? 0 : parseValue(triggerPriceValue, USD_DECIMALS);
  
    const onTriggerPriceChange = (evt) => {
      setTriggerPriceValue(evt.target.value || "");
    };
  
    const onTriggerRatioChange = (evt) => {
      setTriggerRatioValue(evt.target.value || "");
    };

    const [isLeverageSliderEnabled, setIsLeverageSliderEnabled] = useLocalStorageSerializeKey(
        [MAINNET, "Exchange-swap-leverage-slider-enabled"],
        true
    );
    const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey(
        [MAINNET, "Exchange-swap-leverage-option"],
        "2"
    );
    const [shortCollateralAddress, setShortCollateralAddress] = useLocalStorageByChainId(
        MAINNET,
        "Short-Collateral-Address",
        getTokenBySymbol(MAINNET, defaultCollateralSymbol).address
    );
    const changeOption = () => {
        const tmp = toToken;
        setToToken(fromToken);
        setFromToken(tmp);
        setToValue(fromValue);
        setFromValue(0);
    }

    async function getQuote(account){
        if(fromValue && toValue && fromToken && toToken) {
            const params = {
                sellToken: fromToken.address,
                buyToken: toToken.address,
                sellAmount: math.bignumber(fromValue * 10 ** fromToken.decimals).toFixed(0),
                slippagePercentage: "0.01",
                takerAddress: account,
            }
            // Fetch the swap quote.
            const response = await fetch(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(params)}`);
            const swapQuoteJSON = await response.json();
            console.log(swapQuoteJSON)
            // document.getElementById("to_amount").value = swapQuoteJSON.buyAmount / (10 ** currentTrade.to.decimals);
            return swapQuoteJSON;
        }
    }

    async function trySwap(){
        if(isMarketOrder){
            try {
                const web3 = new Web3(window.ethereum);
                const ZERO_EX_ADDRESS = "0xdef1c0ded9bec7f1a1670819833240f027b25eff";
                let takerAddress = account;
                // Set Token Allowance
                // Set up approval amount
                const sellAmount = math.bignumber(fromValue * 10 ** fromToken.decimals).toFixed(0);
                const fromTokenAddress = fromToken.address;
                const contractInstance = new web3.eth.Contract(TOKEN_ABI, fromTokenAddress);
                if(fromTokenAddress !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' && fromTokenAddress !== getContract(56, "NATIVE_TOKEN")){
                    const currentAllowance = new BigNumber(await contractInstance.methods.allowance(takerAddress, ZERO_EX_ADDRESS).call());
                    if (currentAllowance.isLessThan(sellAmount)) {
                        await contractInstance.methods
                            .approve(ZERO_EX_ADDRESS, sellAmount)
                            .send({ from: takerAddress });
                    }
                }
                const swapQuoteJSON = await getQuote(takerAddress);
                await web3.eth.sendTransaction(swapQuoteJSON);
            } catch (err) {
                console.log(err)
            }
        }else{
            signOrder(fromToken, toToken, fromValue, toValue, account);
        }
    }

    const onChangeFromValue = async(e) => {
        setFromValue(e.target.value);
    }

    const onChangeToValue = async(e) => {
        setToValue(e.target.value);
    }

    const selectOption = (sel) => {
        setSwapOption(sel)
    }

    const selectFromtoken = async(token) => {
        setFromToken(token);
    };

    const selectTotoken = async (token) => {
        setToToken(token);
    };

    const onSelectShortCollateralAddress = (token) => {
        setShortCollateralAddress(token.address);
    };
      
    const onOrderOptionChange = (option) => {
        setOrderOption(option);
    };
    
    const getLeaderboardLink = () => {
        return "https://www.gmx.house/bsc/leaderboard";
    };
    
    const leverageSliderHandle = (props) => {
        const { value, dragging, index, ...restProps } = props;
        return (
          <SliderTooltip
            prefixCls="rc-slider-tooltip"
            overlay={`${parseFloat(value).toFixed(2)}x`}
            visible={dragging}
            placement="top"
            key={index}
          >
            <Slider.Handle value={value} {...restProps} />
          </SliderTooltip>
        );
    };

    useEffect(() => {
        const params = {
            baseToken: fromToken.address,
            quoteToken: toToken.address,
        }
        async function getOrderBook(){
            const response = await fetch(`https://bsc.api.0x.org/orderbook/v1?${qs.stringify(params)}`);
            const orderBookJSON = await response.json();
            if(orderBookJSON){
                setOrderBook(orderBookJSON);
            }
        }

        getOrderBook();
    }, [fromToken, toToken, setOrderBook, qs])

    useEffect(() => {
        const params = {
            sellToken: fromToken.address,
            buyToken: toToken.address,
            sellAmount: math.bignumber(fromValue * 10 ** fromToken.decimals).toFixed(0),
            slippagePercentage: "0.01"
        }
        async function fetchData(){
            const response = await fetch(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(params)}`);
            const swapQuoteJSON = await response.json();
            if(swapQuoteJSON?.price){
                setSwapData(swapQuoteJSON);
                setToValue(fromValue * swapQuoteJSON?.price);
                setGasFee(swapQuoteJSON.gas * swapQuoteJSON.gasPrice * swapQuoteJSON.price / (10 ** fromToken.decimals));
            }
        }
        if(fromValue)
            fetchData();
    }, [fromToken, toToken, fromValue, qs])

    useEffect(() => {
        if(triggerRatioValue && fromValue)
            setToValue(fromValue * triggerRatioValue / swapData?.price);
    }, [swapData, triggerRatioValue, fromValue])

    useEffect(() => {
        let str = '';
        const sources = swapData?.sources?.filter((item) => item?.proportion !== '0')
        sources?.forEach((item, idx) => {
            str += item.name;
            if(sources?.length - 1> idx)
                str += ', '
        })
        setSwapPlatform(str);
    }, [swapData])

    return (
        <div className="Exchange-swap-box">
            <div className="Exchange-swap-box-inner App-box-highlight">
                <div className="Tab block Exchange-swap-option-tabs">
                    {tradingOptions.map((option) => {
                        return (
                            <div className={swapOption.toLowerCase() === option.label.toLowerCase()?"Tab-option active":"Tab-option"} onClick={() => selectOption(option.label)} key={option.label}>{option.label}</div>
                        )
                    })}
                </div>
                <Tab
                    options={orderOptions}
                    className="Exchange-swap-order-type-tabs"
                    type="inline"
                    option={orderOption}
                    onChange={onOrderOptionChange}
                />
                <div className="Exchange-swap-section">
                    <div className="Exchange-swap-section-top">
                        <div className="muted">Pay</div>
                    </div>
                    <div className="Exchange-swap-section-bottom">
                        <div className="Exchange-swap-input-container">
                            <input 
                                type="number" 
                                min="0" 
                                placeholder="0.0" 
                                className="Exchange-swap-input" 
                                value={fromValue} 
                                onChange={onChangeFromValue} 
                            />
                        </div>
                        <div className="TokenSelector">
                            <div className="TokenSelector-box"  onClick={() => setFromVisible(true)}>
                                <span>{fromToken?.symbol}</span>
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="TokenSelector-caret" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16.293 9.293 12 13.586 7.707 9.293l-1.414 1.414L12 16.414l5.707-5.707z"></path></svg>
                            </div>
                        </div>
                    </div>
                    <TokenSelector 
                        tokens={getTokens(MAINNET)} 
                        isModalVisible={fromVisible}  
                        setIsModalVisible={setFromVisible}
                        onSelectToken={selectFromtoken}
                    />
                </div>
                
                <div className="Exchange-swap-ball-container">
                    <div className="Exchange-swap-ball" onClick={() => changeOption()}>
                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="Exchange-swap-ball-icon" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M131.3 231.1L32 330.6l99.3 99.4v-74.6h174.5v-49.7H131.3v-74.6zM480 181.4L380.7 82v74.6H206.2v49.7h174.5v74.6l99.3-99.5z"></path></svg>
                    </div>
                </div>

                <div 
                    className="Exchange-swap-section" 
                    onMouseOver={() => setHover(true)} 
                    onMouseOut={() => setHover(false)}
                    style={{position: 'relative'}}
                >
                    <div className="Exchange-swap-section-top">
                        <div className="muted">Receive</div>
                    </div>
                    <div className="Exchange-swap-section-bottom">
                        <div className="Exchange-swap-input-container">
                            <input 
                                type="number" 
                                min="0" 
                                placeholder="0.0" 
                                className="Exchange-swap-input" 
                                value={toValue} 
                                onChange={onChangeToValue} 
                            />
                        </div>
                        <div className="TokenSelector">
                            <div className="TokenSelector-box" onClick={() => setToVisible(true)}>
                                <span>{toToken?.symbol}</span>
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="TokenSelector-caret" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16.293 9.293 12 13.586 7.707 9.293l-1.414 1.414L12 16.414l5.707-5.707z"></path></svg>
                            </div>
                        </div>
                    </div>
                    <TokenSelector 
                        tokens={getTokens(MAINNET)} 
                        isModalVisible={toVisible} 
                        setIsModalVisible={setToVisible}
                        onSelectToken={selectTotoken}
                    />
                    {isSwap && swapData && swapData?.sources?.length > 0 && isHover &&
                        <div className='exchange-description'>
                            <div>{`${swapData?.sources?.length} exchanges searched`}</div>
                            <div className="exchange-description-block">{`We got you the best price from ${swapPlatform}!`}</div>
                            <div className="exchange-description-block" style={{display: 'flex', flexDirection: 'row', width: '100%', flexWrap: 'wrap'}}>
                                {swapData?.sources?.filter(platform => platform?.proportion !== '0')
                                .map((item, idx) => {
                                    return (
                                        <div style={{display: 'flex', width: '100%'}} key={idx}>
                                            <span>{`${Number(item.proportion) * 100}% `}</span>
                                            <div style={{marginLeft: 'auto'}}>{`${item.name}`}</div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="exchange-description-block">
                                <div>Expected Rate</div>
                                <span style={{marginLeft: 'auto'}}>{swapData?.price}</span>
                            </div>
                            <div className="exchange-description-block">
                                <div>Minimum Rate</div>
                                <span style={{marginLeft: 'auto'}}>{swapData?.guaranteedPrice}</span>
                            </div>
                            <div className="exchange-description-block">
                                <div>Max Price Slippage</div>
                                <span style={{marginLeft: 'auto'}}>0.5%</span>
                            </div>
                        </div>
                    }
                </div>

                {showTriggerRatioSection && (
                <div className="Exchange-swap-section">
                    <div className="Exchange-swap-section-top">
                    <div className="muted">Price</div>
                    {fromToken && toToken && (
                        <div
                            className="muted align-right clickable"
                            onClick={() => setTriggerRatioValue(toTokenPrice)}
                        >
                        {toTokenPrice}
                        </div>
                    )}
                    </div>
                    <div className="Exchange-swap-section-bottom">
                    <div className="Exchange-swap-input-container">
                        <input
                            type="number"
                            min="0"
                            placeholder="0.0"
                            className="Exchange-swap-input small"
                            value={triggerRatioValue}
                            onChange={onTriggerRatioChange}
                        />
                    </div>
                    {(() => {
                        if (!toToken) return;
                        if (!fromToken) return;
                        return (
                        <div className="PositionEditor-token-symbol">
                            {fromToken.symbol}&nbsp;per&nbsp;{toToken.symbol}
                        </div>
                        );
                    })()}
                    </div>
                </div>
            )}
            {showTriggerPriceSection && (
                <div className="Exchange-swap-section">
                    <div className="Exchange-swap-section-top">
                    <div className="muted">Price</div>
                    <div
                        className="muted align-right clickable"
                        onClick={() => {
                            setTriggerPriceValue(formatAmountFree(entryMarkPrice, USD_DECIMALS, 2));
                        }}
                    >
                        Mark: {formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)}
                    </div>
                    </div>
                    <div className="Exchange-swap-section-bottom">
                    <div className="Exchange-swap-input-container">
                        <input
                            type="number"
                            min="0"
                            placeholder="0.0"
                            className="Exchange-swap-input"
                            value={triggerPriceValue}
                            onChange={onTriggerPriceChange}
                        />
                    </div>
                    <div className="PositionEditor-token-symbol">USD</div>
                    </div>
                </div>
            )}
                <div className="Exchange-swap-box-info">
                    <div className="Exchange-info-row">
                        <div className="Exchange-info-label">
                            Fees
                        </div>
                        <div className="align-right">
                            {gasFee?`${gasFee} USD`:'-'}
                        </div>
                    </div>
                </div>

                {(isLong || isShort) && (
                    <div className="Exchange-leverage-box">
                        <div className="Exchange-leverage-slider-settings">
                        <Checkbox isChecked={isLeverageSliderEnabled} setIsChecked={setIsLeverageSliderEnabled}>
                            <span className="muted">Leverage slider</span>
                        </Checkbox>
                        </div>
                        {isLeverageSliderEnabled && (
                        <div
                            className={cx("Exchange-leverage-slider", "App-slider", {
                            positive: isLong,
                            negative: isShort,
                            })}
                        >
                            <Slider
                                min={1.1}
                                max={30.5}
                                step={0.1}
                                marks={leverageMarks}
                                handle={leverageSliderHandle}
                                onChange={(value) => setLeverageOption(value)}
                                value={leverageOption}
                                defaultValue={leverageOption}
                            />
                        </div>
                        )}
                        {isShort && (
                        <div className="Exchange-info-row">
                            <div className="Exchange-info-label">Profits In</div>
                            <div className="align-right">
                            <TokenSelector
                                label="Profits In"
                                onSelectToken={onSelectShortCollateralAddress}
                                tokens={stableTokens}
                                isModalVisible={toVisible} 
                                setIsModalVisible={setToVisible}
                            />
                            </div>
                        </div>
                        )}
                        {isLong && (
                        <div className="Exchange-info-row">
                            <div className="Exchange-info-label">Profits In</div>
                            <div className="align-right strong">{toToken.symbol}</div>
                        </div>
                        )}
                        <div className="Exchange-info-row">
                        <div className="Exchange-info-label">Leverage</div>
                        <div className="align-right">
                            {/* {hasExistingPosition && toAmount && toAmount.gt(0) && (
                            <div className="inline-block muted">
                                {formatAmount(existingPosition.leverage, 4, 2)}x
                                <BsArrowRight className="transition-arrow" />
                            </div>
                            )}
                            {toAmount && leverage && leverage.gt(0) && `${formatAmount(leverage, 4, 2)}x`}
                            {!toAmount && leverage && leverage.gt(0) && `-`}
                            {leverage && leverage.eq(0) && `-`} */}
                        </div>
                        </div>
                        <div className="Exchange-info-row">
                        <div className="Exchange-info-label">Entry Price</div>
                        <div className="align-right">
                            {/* {hasExistingPosition && toAmount && toAmount.gt(0) && (
                            <div className="inline-block muted">
                                ${formatAmount(existingPosition.averagePrice, USD_DECIMALS, 2, true)}
                                <BsArrowRight className="transition-arrow" />
                            </div>
                            )}
                            {nextAveragePrice && `$${formatAmount(nextAveragePrice, USD_DECIMALS, 2, true)}`}
                            {!nextAveragePrice && `-`} */}
                        </div>
                        </div>
                        <div className="Exchange-info-row">
                        <div className="Exchange-info-label">Liq. Price</div>
                        <div className="align-right">
                            {/* {hasExistingPosition && toAmount && toAmount.gt(0) && (
                            <div className="inline-block muted">
                                ${formatAmount(existingLiquidationPrice, USD_DECIMALS, 2, true)}
                                <BsArrowRight className="transition-arrow" />
                            </div>
                            )}
                            {toAmount &&
                            displayLiquidationPrice &&
                            `$${formatAmount(displayLiquidationPrice, USD_DECIMALS, 2, true)}`}
                            {!toAmount && displayLiquidationPrice && `-`}
                            {!displayLiquidationPrice && `-`} */}
                        </div>
                        </div>
                        <ExchangeInfoRow label="Fees">
                        <div>
                            {!feesUsd && "-"}
                            {feesUsd && (
                            <Tooltip
                                handle={`$${formatAmount(feesUsd, USD_DECIMALS, 2, true)}`}
                                position="right-bottom"
                                renderContent={() => {
                                return (
                                    <>
                                    {swapFees && (
                                        <div>
                                            {/* {collateralToken.symbol} is required for collateral. <br />
                                            <br />
                                            Swap {fromToken.symbol} to {collateralToken.symbol} Fee: $
                                            {formatAmount(swapFees, USD_DECIMALS, 2, true)}
                                            <br />  
                                            <br /> */}
                                        </div>
                                    )}
                                    <div>
                                        Position Fee (0.1% of position size): ${formatAmount(positionFee, USD_DECIMALS, 2, true)}
                                    </div>
                                    </>
                                );
                                }}
                            />
                            )}
                        </div>
                        </ExchangeInfoRow>
                    </div>
                )}

                <div className="Exchange-swap-button-container">
                    {!active?
                        <div className="App-cta Exchange-swap-button" onClick={() => connectWallet(true)}>
                            Connect Wallet
                        </div>:
                        <div className="App-cta Exchange-swap-button" onClick={() => trySwap()}>
                            Swap
                        </div>    
                    }
                </div>
            </div>
            {isSwap && (
                <div className="Exchange-swap-market-box App-box App-box-border">
                <div className="Exchange-swap-market-box-title">Swap</div>
                <div className="App-card-divider"></div>
                <div className="Exchange-info-row">
                    <div className="Exchange-info-label">{fromToken.symbol} Price</div>
                    <div className="align-right">
                        {`${fromTokenPrice} USD `}
                    </div>
                </div>
                <div className="Exchange-info-row">
                    <div className="Exchange-info-label">{toToken.symbol} Price</div>
                    <div className="align-right">
                        {`${toTokenPrice} USD`}
                    </div>
                </div>
                {!isMarketOrder && (
                    <ExchangeInfoRow label="Price">
                        {/* {getExchangeRateDisplay(getExchangeRate(fromTokenInfo, toTokenInfo), fromToken, toToken)} */}
                        {`0 ${fromToken.symbol} / ${toToken.symbol}`}
                    </ExchangeInfoRow>
                )}
                </div>
            )}
            <div className="Exchange-swap-market-box App-box App-box-border">
                <div className="Exchange-swap-market-box-title">Useful Links</div>
                <div className="App-card-divider"></div>
                <div className="Exchange-info-row">
                <div className="Exchange-info-label-button">
                    <a href="https://gmxio.gitbook.io/gmx/trading" target="_blank" rel="noopener noreferrer">
                    Trading guide
                    </a>
                </div>
                </div>
                <div className="Exchange-info-row">
                <div className="Exchange-info-label-button">
                    <a href={getLeaderboardLink()} target="_blank" rel="noopener noreferrer">
                    Leaderboard
                    </a>
                </div>
                </div>
                <div className="Exchange-info-row">
                <div className="Exchange-info-label-button">
                    <a href="https://gmxio.gitbook.io/gmx/trading#backup-rpc-urls" target="_blank" rel="noopener noreferrer">
                    Speed up page loading
                    </a>
                </div>
                </div>
            </div>
        </div>
    )
}