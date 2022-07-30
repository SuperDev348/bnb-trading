import React, { useState, useEffect } from "react";
import cx from "classnames";

import { formatAmount, expandDecimals, bigNumberify } from "../../Helpers";

import { getToken } from "../../data/Tokens";

import { BiChevronDown } from "react-icons/bi";

import Modal from "../Modal/Modal";

import dropDownIcon from "../../img/DROP_DOWN.svg";
import "./TokenSelector.css";

export default function TokenSelector(props) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const {
    tokens,
    disabled,
    isModalVisible,
    setIsModalVisible
  } = props;
  const onSelectToken = (token) => {
    setIsModalVisible(false);
    props.onSelectToken(token);
  };

  useEffect(() => {
    if (isModalVisible) {
      setSearchKeyword("");
    }
  }, [isModalVisible]);

  const onSearchKeywordChange = (e) => {
    setSearchKeyword(e.target.value);
  };

  const filteredTokens = tokens.filter((item) => {
    return (
      item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
      item.symbol.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1
    );
  });

  const _handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredTokens.length > 0) {
      onSelectToken(filteredTokens[0]);
    }
  };

  return (
    <div className={cx("TokenSelector", { disabled }, props.className)}>
      <Modal isVisible={isModalVisible} setIsVisible={setIsModalVisible} label='Pay'>
        <div className="TokenSelector-tokens">
            <div className="TokenSelector-token-row TokenSelector-token-input-row">
                <input
                    type="text"
                    placeholder="Search Token"
                    onChange={(e) => onSearchKeywordChange(e)}
                    onKeyDown={_handleKeyDown}
                    value={searchKeyword}
                    autoFocus
                />
            </div>
            {filteredTokens.map((token) => {
                // let tokenPopupImage;
                // try {
                //     tokenPopupImage = require(`../../img/ic_${token.symbol.toLowerCase()}_40.svg`);
                // } catch (error) {
                //     tokenPopupImage = require("../../img/ic_eth_40.svg");
                // }
                
                return (
                <div className="TokenSelector-token-row" onClick={() => onSelectToken(token)} key={token.address}>
                    <div className="Token-info">
                    <img src={token.imageUrl} alt={token.symbol} className="token-logo" />
                    <div className="Token-symbol">
                        <div className="Token-text">{token.symbol}</div>
                        <span className="text-accent">{token.name}</span>
                    </div>
                    </div>
                </div>
                );
            })}
        </div>
      </Modal>
    </div>
  );
}