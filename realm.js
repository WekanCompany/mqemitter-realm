'use strict';

const Realm = require('realm');

exports.loginEmailPassword = async (app, email, password) => {
  return app.logIn(Realm.Credentials.emailPassword(email, password));
};
