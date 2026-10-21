/* eslint-disable react/prop-types */
import React, { createContext, useState, useContext } from 'react';
import PropTypes from 'prop-types';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  return (
    <AppContext.Provider value={{ isLoggedIn, setIsLoggedIn, userName, setUserName }}>
      {children}
    </AppContext.Provider>
  );
};

AppProvider.PropTypes = {
  children: PropTypes.node
};

export const useAppContext = () => useContext(AppContext);
