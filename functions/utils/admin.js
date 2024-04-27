const admin = require('firebase-admin');
const auth = require('firebase/auth')
const functions = require('firebase-functions')

var serviceAccount = require('../serviceAccount.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

const store = admin.firestore();

module.exports = { admin, store, auth, functions }