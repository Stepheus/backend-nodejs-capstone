/* eslint-disable react/prop-types */
import { createContext, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import {AppContext} from "./AppProvider";

AppProvider.PropTypes = {
  children: PropTypes.node
};

export const useAppContext = () => useContext(AppContext);
