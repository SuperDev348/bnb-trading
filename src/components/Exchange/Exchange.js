import React, { useEffect, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import ExchangeTVChart from './ExchangeTVChart';
import {
    SWAP,
    LONG,
    SHORT,
    useLocalStorageByChainId,
  } from "../../Helpers";
import { MAINNET } from "../../Helpers";
import { useWeb3React } from "@web3-react/core";
import TradeHistory from "../../components/Exchange/TradeHistory";
import Tab from "../../components/Tab/Tab";
import SwapBox from './SwapBox';

import './Exchange.css';


export default function Exchange({
    setWalletModalVisible,
    fromToken,
    setFromToken,
    toToken,
    setToToken,
    swapOption,
    setSwapOption,
    savedShouldShowPositionLines, 
    setSavedShouldShowPositionLines
}){

  const { active, account, library } = useWeb3React();

  const flagOrdersEnabled = true;
  const orders = [];

  const getListSection = () => {
    return (
      <div>
        <div className="Exchange-list-tab-container">
          <Tab
            options={LIST_SECTIONS}
            optionLabels={LIST_SECTIONS_LABELS}
            option={listSection}
            onChange={(section) => setListSection(section)}
            type="inline"
            className="Exchange-list-tabs"
          />
          <div className="align-right Exchange-should-show-position-lines">
            {/* <Checkbox isChecked={savedShouldShowPositionLines} setIsChecked={setSavedShouldShowPositionLines}>
              <span className="muted">Chart positions</span>
            </Checkbox> */}
          </div>
        </div>
        {/* {listSection === "Positions" && (
          <PositionsList
            positionsDataIsLoading={positionsDataIsLoading}
            pendingPositions={pendingPositions}
            setPendingPositions={setPendingPositions}
            setListSection={setListSection}
            setIsWaitingForPluginApproval={setIsWaitingForPluginApproval}
            setIsWaitingForPositionRouterApproval={setIsWaitingForPositionRouterApproval}
            approveOrderBook={approveOrderBook}
            approvePositionRouter={approvePositionRouter}
            isPluginApproving={isPluginApproving}
            isPositionRouterApproving={isPositionRouterApproving}
            isWaitingForPluginApproval={isWaitingForPluginApproval}
            isWaitingForPositionRouterApproval={isWaitingForPositionRouterApproval}
            orderBookApproved={orderBookApproved}
            positionRouterApproved={positionRouterApproved}
            positions={positions}
            positionsMap={positionsMap}
            infoTokens={infoTokens}
            active={active}
            account={account}
            library={library}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
            flagOrdersEnabled={flagOrdersEnabled}
            savedIsPnlInLeverage={savedIsPnlInLeverage}
            chainId={chainId}
            nativeTokenAddress={nativeTokenAddress}
            setMarket={setMarket}
            orders={orders}
            showPnlAfterFees={savedShowPnlAfterFees}
          />
        )} */}
        {/* {listSection === "Orders" && (
          <OrdersList
            account={account}
            active={active}
            library={library}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
            infoTokens={infoTokens}
            positionsMap={positionsMap}
            chainId={chainId}
            orders={orders}
            totalTokenWeights={totalTokenWeights}
            usdgSupply={usdgSupply}
            savedShouldDisableOrderValidation={savedShouldDisableOrderValidation}
          />
        )} */}
        {listSection === "Trades" && (
          <TradeHistory
            account={account}
            chainId={MAINNET}
          />
        )}
      </div>
    );
  };

  const LIST_SECTIONS = ["Positions", flagOrdersEnabled ? "Orders" : undefined, "Trades"].filter(Boolean);
  let [listSection, setListSection] = useLocalStorageByChainId(MAINNET, "List-section-v2", LIST_SECTIONS[0]);
  const LIST_SECTIONS_LABELS = {
    Orders: orders.length ? `Orders (${orders.length})` : undefined,
    // Positions: positions.length ? `Positions (${positions.length})` : undefined,
  };
  if (!LIST_SECTIONS.includes(listSection)) {
    listSection = LIST_SECTIONS[0];
  }

  const renderChart = () => {
    return (
        <ExchangeTVChart
          fromToken={fromToken}
          toToken={toToken}
          swapOption={SWAP}
          orders={[]}
          positions={[]}
          savedShouldShowPositionLines={savedShouldShowPositionLines}
        />
    );
  };

    return (
        <div>
          <div className="Exchange page-layout">
            <div className="Exchange-content">
              <div className="Exchange-left">
                {renderChart()}
                <div className="Exchange-lists large">{getListSection()}</div>
              </div>
              <div className="Exchange-right">
                <SwapBox
                  connectWallet={setWalletModalVisible}
                  fromToken={fromToken}
                  setFromToken={setFromToken}
                  toToken={toToken}
                  setToToken={setToToken}
                  swapOption={swapOption}
                  setSwapOption={setSwapOption}
                />
                <div className="Exchange-wallet-tokens">
                  <div className="Exchange-wallet-tokens-content">
                    {/* <ExchangeWalletTokens tokens={tokens} infoTokens={infoTokens} onSelectToken={onSelectWalletToken} /> */}
                  </div>
                </div>
              </div>
              <div className="Exchange-lists small">{getListSection()}</div>
            </div>
          </div>
        </div>
    )
}