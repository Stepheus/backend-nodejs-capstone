/* eslint-disable react/prop-types */
import {useContext, createContext, useState } from 'react';
import PropTypes from 'prop-types';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  
  return(
    <AppContext.Provider value={{ isLoggedIn, setIsLoggedIn, userName, setUserName }}>
      {children}
    </AppContext.Provider>
  );
};


AppProvider.PropTypes = {
  children: PropTypes.node
};

export function useAppContext() {
  const context =
  useContext(AppContext);
  return context;
};
