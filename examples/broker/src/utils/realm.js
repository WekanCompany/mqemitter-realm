'use strict';

const Realm = require('realm');

exports.app = new Realm.App(process.env.AEDES_REALM_APP_ID);

exports.loginEmailPassword = async (email, password) => {

  const credentials = Realm.Credentials.emailPassword(email, password);

  return this.app.logIn(credentials).catch((error) => {
    console.log('Failed to login to realm', error);
    return false;
  });
};
