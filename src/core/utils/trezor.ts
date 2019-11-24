import TrezorConnect from 'trezor-connect';

// TODO: figure out who wants to be the first point of contact for trezor
// https://github.com/trezor/connect/blob/develop/docs/index.md#trezor-connect-manifest
// TrezorConnect.manifest({
//     email: 'chris@crunchycloud.io',
//     appUrl: 'http://localhost:8080'
// })

// TODO: revert back to prod, use this local dev
TrezorConnect.init({
    // origin: 'https://localhost:8088',
    // iframeSrc: `${ DEFAULT_DOMAIN }iframe.html`,
    // popup: true,
    // popupSrc: `${ DEFAULT_DOMAIN }popup.html`,
    // webusbSrc: `${ DEFAULT_DOMAIN }webusb.html`,
    connectSrc: "http://localhost:8088/",
    lazyLoad: true,
    debug: true,
    manifest: {
      email: 'chris@crunchycloud.io',
      appUrl: 'http://localhost:3000'
    }
  })

export default TrezorConnect;