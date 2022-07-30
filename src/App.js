import React, { useState, useEffect, useCallback, useRef } from "react";
import Exchange from './components/Exchange/Exchange';
import {
  MAINNET,
  SLIPPAGE_BPS_KEY,
  BASIS_POINTS_DIVISOR,
  IS_PNL_IN_LEVERAGE_KEY,
  SHOW_PNL_AFTER_FEES_KEY,
  DISABLE_ORDER_VALIDATION_KEY,
  DEFAULT_SLIPPAGE_AMOUNT,
  SHOULD_SHOW_POSITION_LINES_KEY,
  useLocalStorageSerializeKey,
  switchNetwork,
  useChainId,
  getChainName,
  getAccountUrl,
  clearWalletLinkData,
  clearWalletConnectData,
  SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY,
  CURRENT_PROVIDER_LOCALSTORAGE_KEY,
  hasMetaMaskWalletExtension,
  hasCoinBaseWalletExtension,
  getWalletConnectHandler,
  activateInjectedProvider,
  helperToast,
  isMobileDevice,
  getInjectedHandler,
  LONG,
  SWAP,
} from "./Helpers";
import { Web3ReactProvider, useWeb3React } from "@web3-react/core";
import { Web3Provider } from "@ethersproject/providers";
import connectWalletImg from "./img/ic_wallet_24.svg";
import { ConnectWalletButton } from "./components/Common/Button";
import NetworkSelector from "./components/NetworkSelector/NetworkSelector";
import AddressDropdown from "./components/AddressDropdown/AddressDropdown";

import Modal from "./components/Modal/Modal";
import metamaskImg from "./img/metamask.png";
import coinbaseImg from "./img/coinbaseWallet.png";
import walletConnectImg from "./img/walletconnect-circle-blue.svg";

import { getTokens } from "./data/Tokens";
import { RiMenuLine } from "react-icons/ri";
import { FaTimes } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import logoImg from "./img/logo_GMX.svg";
import logoSmallImg from "./img/logo_GMX_small.svg";
import cx from "classnames";
import './Shared.css';
import './App.css'

function getLibrary(provider) {
  const library = new Web3Provider(provider);
  return library;
}

function inPreviewMode() {
  return false;
}

function AppHeaderLinks({ small, openSettings, clickCloseIcon }) {
  if (inPreviewMode()) {
    return (
      <div className="App-header-links preview">
        <div className="App-header-link-container App-header-link-home">
          <a className="active" href="/">
            HOME
          </a>
        </div>
        <div className="App-header-link-container">
          <a className="active" href="/earn">
            EARN
          </a>
        </div>
        <div className="App-header-link-container">
          <a href="https://gmxio.gitbook.io/gmx/" target="_blank" rel="noopener noreferrer">
            ABOUT
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="App-header-links">
      {small && (
        <div className="App-header-links-header">
          <div className="App-header-menu-icon-block" onClick={() => clickCloseIcon()}>
            <FiX className="App-header-menu-icon" />
          </div>
          <a className="App-header-link-main" href="/">
            <img src={logoImg} alt="GMX Logo" />
          </a>
        </div>
      )}
      <div className="App-header-link-container App-header-link-home">
        <a className="active" href="/">
          Home
        </a>
      </div>
      {small && (
        <div className="App-header-link-container">
          <a className="active" href="/trade">
            Trade
          </a>
        </div>
      )}
      <div className="App-header-link-container">
        <a className="active" href="/dashboard">
          Dashboard
        </a>
      </div>
      <div className="App-header-link-container">
        <a className="active" href="/earn">
          Earn
        </a>
      </div>
      <div className="App-header-link-container">
        <a href="https://gmxio.gitbook.io/gmx/" target="_blank" rel="noopener noreferrer">
          About
        </a>
      </div>
      {small && (
        <div className="App-header-link-container">
          {/* eslint-disable-next-line */}
          <a href="#" onClick={openSettings}>
            Settings
          </a>
        </div>
      )}
    </div>
  );
}

function AppHeaderUser({
  openSettings,
  small,
  setWalletModalVisible,
  showNetworkSelectorModal,
  disconnectAccountAndCloseSettings,
}) {
  const { chainId } = useChainId();
  const { active, account } = useWeb3React();
  const showSelector = true;
  const networkOptions = [
    {
      label: "Binance",
      value: MAINNET,
      icon: "ic_binance_24.svg",
      color: "#E841424D",
    },
  ];

  useEffect(() => {
    if (active) {
      setWalletModalVisible(false);
    }
  }, [active, setWalletModalVisible]);

  const onNetworkSelect = useCallback(
    (option) => {
      if (option.value === chainId) {
        return;
      }
      return switchNetwork(option.value, active);
    },
    [chainId, active]
  );

  const selectorLabel = getChainName(chainId);

  if (!active) {
    return (
      <div className="App-header-user">
        <div className="App-header-user-link">
          <a className="default-btn" href="/trade">
            Trade
          </a>
        </div>
        {showSelector && (
          <NetworkSelector
            options={networkOptions}
            label={selectorLabel}
            onSelect={onNetworkSelect}
            className="App-header-user-netowork"
            showCaret={true}
            modalLabel="Select Network"
            small={small}
            showModal={showNetworkSelectorModal}
          />
        )}
        <ConnectWalletButton onClick={() => setWalletModalVisible(true)} imgSrc={connectWalletImg}>
          {small ? "Connect" : "Connect Wallet"}
        </ConnectWalletButton>
      </div>
    );
  }

  const accountUrl = getAccountUrl(chainId, account);

  return (
    
      <div className="App-header-container-right">
        <div className="App-header-user">
          <div className="App-header-user-link">
            <a className="default-btn" href="/trade">
              Trade
            </a>
          </div>
          {showSelector && (
            <NetworkSelector
              options={networkOptions}
              label={selectorLabel}
              onSelect={onNetworkSelect}
              className="App-header-user-netowork"
              showCaret={true}
              modalLabel="Select Network"
              small={small}
              showModal={showNetworkSelectorModal}
            />
          )}
          <div className="App-header-user-address">
            <AddressDropdown
              account={account}
              small={small}
              accountUrl={accountUrl}
              disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
              openSettings={openSettings}
            />
          </div>
        </div>
      </div>
  );
}


function FullApp() {
  const { connector, library, deactivate, activate, active } = useWeb3React();
  const [activatingConnector, setActivatingConnector] = useState();
  const [fromToken, setFromToken] = useState(getTokens(MAINNET)[2]);
  const [toToken, setToToken] = useState(getTokens(MAINNET)[5]);
  const [swapOption, setSwapOption] = useState(LONG);
  const [isDrawerVisible, setIsDrawerVisible] = useState(undefined);

  const [savedShouldShowPositionLines, setSavedShouldShowPositionLines] = useLocalStorageSerializeKey(
    [MAINNET, SHOULD_SHOW_POSITION_LINES_KEY],
    false
  );
  const [savedSlippageAmount, setSavedSlippageAmount] = useLocalStorageSerializeKey(
    [MAINNET, SLIPPAGE_BPS_KEY],
    DEFAULT_SLIPPAGE_AMOUNT
  );
  const [slippageAmount, setSlippageAmount] = useState(0);
  const [isPnlInLeverage, setIsPnlInLeverage] = useState(false);
  const [shouldDisableOrderValidation, setShouldDisableOrderValidation] = useState(false);
  const [showPnlAfterFees, setShowPnlAfterFees] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState();
  const [isNativeSelectorModalVisible, setisNativeSelectorModalVisible] = useState(false);

  const [savedIsPnlInLeverage, setSavedIsPnlInLeverage] = useLocalStorageSerializeKey(
    [MAINNET, IS_PNL_IN_LEVERAGE_KEY],
    false
  );
  const [savedShowPnlAfterFees, setSavedShowPnlAfterFees] = useLocalStorageSerializeKey(
    [MAINNET, SHOW_PNL_AFTER_FEES_KEY],
    false
  );
  
  const [savedShouldDisableOrderValidation, setSavedShouldDisableOrderValidation] = useLocalStorageSerializeKey(
    [MAINNET, DISABLE_ORDER_VALIDATION_KEY],
    false
  );

  const userOnMobileDevice = "navigator" in window && isMobileDevice(window.navigator);

  const openSettings = () => {
    const slippage = parseInt(savedSlippageAmount);
    setSlippageAmount((slippage / BASIS_POINTS_DIVISOR) * 100);
    setIsPnlInLeverage(savedIsPnlInLeverage);
    setShowPnlAfterFees(savedShowPnlAfterFees);
    setShouldDisableOrderValidation(savedShouldDisableOrderValidation);
  };
  const showNetworkSelectorModal = (val) => {
    setisNativeSelectorModalVisible(val);
  };
  const disconnectAccount = useCallback(() => {
    // only works with WalletConnect
    clearWalletConnectData();
    // force clear localStorage connection for MM/CB Wallet (Brave legacy)
    clearWalletLinkData();
    deactivate();
  }, [deactivate]);

  const disconnectAccountAndCloseSettings = () => {
    disconnectAccount();
    localStorage.removeItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY);
    localStorage.removeItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY);
    // setIsSettingsVisible(false);
  };

  const activateMetaMask = () => {
    if (!hasMetaMaskWalletExtension()) {
      helperToast.error(
        <div>
          MetaMask not detected.
          <br />
          <br />
          <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
            Install MetaMask
          </a>
          {userOnMobileDevice ? ", and use GMX with its built-in browser" : " to start using GMX"}.
        </div>
      );
      return false;
    }
    attemptActivateWallet("MetaMask");
  };
  const activateCoinBase = () => {
    if (!hasCoinBaseWalletExtension()) {
      helperToast.error(
        <div>
          Coinbase Wallet not detected.
          <br />
          <br />
          <a href="https://www.coinbase.com/wallet" target="_blank" rel="noopener noreferrer">
            Install Coinbase Wallet
          </a>
          {userOnMobileDevice ? ", and use GMX with its built-in browser" : " to start using GMX"}.
        </div>
      );
      return false;
    }
    attemptActivateWallet("CoinBase");
  };

  const activateWalletConnect = () => {
    getWalletConnectHandler(activate, deactivate, setActivatingConnector)();
  };
  const connectInjectedWallet = getInjectedHandler(activate);

  const attemptActivateWallet = (providerName) => {
    localStorage.setItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY, true);
    localStorage.setItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY, providerName);
    activateInjectedProvider(providerName);
    connectInjectedWallet();
  };

  return (
      <div className="App-content">
        <header>
          <div className="App-header large">
            <div className="App-header-container-left">
              <a className="App-header-link-main" href="/">
                <img src={logoImg} className="big" alt="GMX Logo" />
                <img src={logoSmallImg} className="small" alt="GMX Logo" />
              </a>
              <AppHeaderLinks />
            </div>
            <div className="App-header-container-right">
              <AppHeaderUser
                disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
                openSettings={openSettings}
                setActivatingConnector={setActivatingConnector}
                walletModalVisible={walletModalVisible}
                setWalletModalVisible={setWalletModalVisible}
                showNetworkSelectorModal={showNetworkSelectorModal}
              />
            </div>
          </div>
          <div className={cx("App-header", "small", { active: isDrawerVisible })}>
            <div
              className={cx("App-header-link-container", "App-header-top", {
                active: isDrawerVisible,
              })}
            >
              <div className="App-header-container-left">
                <div className="App-header-menu-icon-block" onClick={() => setIsDrawerVisible(!isDrawerVisible)}>
                  {!isDrawerVisible && <RiMenuLine className="App-header-menu-icon" />}
                  {isDrawerVisible && <FaTimes className="App-header-menu-icon" />}
                </div>
                <div className="App-header-link-main clickable" onClick={() => setIsDrawerVisible(!isDrawerVisible)}>
                  <img src={logoImg} className="big" alt="GMX Logo" />
                  <img src={logoSmallImg} className="small" alt="GMX Logo" />
                </div>
              </div>
              <div className="App-header-container-right">
                <AppHeaderUser
                  disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
                  openSettings={openSettings}
                  setActivatingConnector={setActivatingConnector}
                  walletModalVisible={walletModalVisible}
                  setWalletModalVisible={setWalletModalVisible}
                  showNetworkSelectorModal={showNetworkSelectorModal}
                />
              </div>
            </div>
          </div>
        </header>
        <Exchange
          setWalletModalVisible={setWalletModalVisible}
          fromToken={fromToken}
          setFromToken={setFromToken}
          toToken={toToken}
          setToToken={setToToken}
          swapOption={swapOption}
          setSwapOption={setSwapOption}
          savedShouldShowPositionLines={savedShouldShowPositionLines}
          setSavedShouldShowPositionLines={setSavedShouldShowPositionLines}
        />
        <Modal
          className="Connect-wallet-modal"
          isVisible={walletModalVisible}
          setIsVisible={setWalletModalVisible}
          label="Connect Wallet"
        >
          <button className="Wallet-btn MetaMask-btn" onClick={activateMetaMask}>
            <img src={metamaskImg} alt="MetaMask" />
            <div>MetaMask</div>
          </button>
          <button className="Wallet-btn CoinbaseWallet-btn" onClick={activateCoinBase}>
            <img src={coinbaseImg} alt="Coinbase Wallet" />
            <div>Coinbase Wallet</div>
          </button>
          <button className="Wallet-btn WalletConnect-btn" onClick={activateWalletConnect}>
            <img src={walletConnectImg} alt="WalletConnect" />
            <div>WalletConnect</div>
          </button>
        </Modal>
      </div>
  );
}

function App(){
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <FullApp />
    </Web3ReactProvider>
  )
}

export default App;
