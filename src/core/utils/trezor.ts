import TrezorConnect from 'trezor-connect';

// TODO: figure out who wants to be the first point of contact for trezor
// https://github.com/trezor/connect/blob/develop/docs/index.md#trezor-connect-manifest
TrezorConnect.init({
    // ***Enable these fields when developing locally***
    // connectSrc: "http://localhost:8088/",
    // lazyLoad: true,
    // debug: true,
    manifest: {
      email: 'chris@crunchycloud.io',
      appUrl: 'http://localhost:8080'
    }
})

export default TrezorConnect;