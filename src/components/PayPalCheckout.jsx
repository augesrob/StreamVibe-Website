import React from 'react';
import PayPalCheckoutOfficial from './PayPalCheckoutOfficial';

/**
 * @deprecated This component is deprecated. Please use PayPalCheckoutOfficial.jsx instead.
 * This file is kept as a redirect wrapper to prevent breaking imports during migration.
 */
const PayPalCheckout = (props) => {
  return <PayPalCheckoutOfficial {...props} />;
};

export default PayPalCheckout;