const { admin, store } = require('./admin')

/**
 * Token verification for private entries.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next The function which is to be called after the verification is completed.
 * @returns 
 */
module.exports = (req, res, next) => {
    let idToken;
  
    // Check for token with the beginning string as 'Bearer'
    if ( req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ) {
      idToken = req.headers.authorization.split('Bearer ')[1];
      // console.log("Extracted Token:", idToken); 
    } else {
      console.error('No token found');
      return res.status(403).json({ error: 'Unauthorized access' });
    }
  
    admin.auth().verifyIdToken(idToken)
      .then(decodedToken => {
        req.user = decodedToken; 
        // console.log("Decoded Token:", decodedToken);
        
        return store.collection('users')
          .where('userId', '==', req.user.uid)
          .limit(1)
          .get();
      })
      .then(data => {
        if (!data.empty) {
          req.user.handle = data.docs[0].data().handle;
          req.user.imageUrl = data.docs[0].data().imageUrl
          next(); 
        } else {
          return res.status(404).json({ error: 'User not found in the database' });
        }
      })
      .catch(err => {
        console.error('Error while verifying token', err);
        return res.status(403).json({ error: 'Token verification failed, access unauthorized' });
      });
  }