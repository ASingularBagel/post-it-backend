const { admin, store } = require('../utils/admin')
const config = require('../utils/config')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')

const auth = getAuth();

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../utils/validators')

// Sign user in
exports.signup = ( req, res ) => {
    const newUser = {
      email: req.body.email, 
      password: req.body.password, 
      confirmPassword: req.body.confirmPassword, 
      handle: req.body.handle, 
    }
    
    let { valid, errors } = validateSignupData(newUser);

    const noImg = 'no-img.png'

    let token;
    let uid;

    store.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
      if (doc.exists) {
        errors.handle = "This handle is already taken.";
        valid = false;
      }
      return admin.auth().getUserByEmail(newUser.email).catch(error => {
        if (error.code === 'auth/user-not-found') {
          return null;
        } else {
          throw error;
        }
      });
    })
    .then(userRecord => {
      if (userRecord !== null) {
        errors.email = "This email is already in use.";
        valid = false;
      }
      if (!valid) {
        res.status(400).json(errors);
        throw new Error('Invalid data');
      }
    
      return admin.auth().createUser({
        email: newUser.email,
        password: newUser.password,
        displayName: newUser.handle
      });
    })
    .then(userRecord => {
        uid = userRecord.uid;
        return admin.auth().createCustomToken(userRecord.uid);

    })
    .then((customToken) => {
      token = customToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${encodeURIComponent(noImg)}?alt=media`,
        userId: uid,
      }
      return store.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch(error => {
      if (error.message !== 'Invalid data') {
        console.error(error);
        return res.status(500).json({ general: 'Something went wrong. Please try again.'});
      }
    });
  }

// Log user in 
exports.login = (req, res) => {
    const user = {
      email: req.body.email, 
      password: req.body.password
    }
  
    // VALIDATE DATA 
    const { valid, errors } = validateLoginData(user);

    if ( !valid ) return res.status(400).json(errors)
  
    // Log user in 
    signInWithEmailAndPassword(auth, user.email, user.password)
      .then(data => {
        return data.user.getIdToken(); 
      })
      .then(token => {
        return res.json({ token }); 
      })
      .catch(err => {
        console.error(err);
        if ( err.code === 'auth/invalid-credential' ) {
          return res.status(403).json({ general: 'Wrong credentials. Please try again.'})
        } else return res.status(500).json({ error: err.code + ": " + err.message });
      });
  }

// Add user details 
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body); 

    store.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(() => {
        return res.json({ message: "Details added successfully."})
    })
    .catch(err => {
        console.error(err); 
        return res.status(500).json({ error: err.code + ": " + err.message });
    })
}

// Get current user's details 
exports.getAuthenticatedUser = (req, res) => {
    let userData = {}

    store.doc(`/users/${req.user.handle}`).get()
    .then(( doc ) => {
        if ( doc.exists ) {
            userData.credentials = doc.data(); 
            return store.collection('likes')
            .where('userHandle', '==', req.user.handle).get()
        }
    })
    .then((data) => {
        userData.likes = []
        data.forEach((document) => {
            userData.likes.push(document.data()); 
        })
        return store.collection('notifications')
        .where('recipient', '==', req.user.handle)
        .orderBy('createdAt', 'desc').limit(10).get()
        .then(( data ) => {
          userData.notifications = []

          data.forEach((document) => {
            userData.notifications.push({
              recipient: document.data().recipient,
              sender: document.data().sender,
              createdAt: document.data().createdAt,
              postId: document.data().postId,
              type: document.data().type,
              read: document.data().read,
              notificationId: document.id, 
              imageUrl: document.data().imageUrl,
            })
          }); 

          return res.json(userData)
        })
    })
    .catch( err => {
        console.error(err); 
        return res.status(500).json({ error: err.code + ": " + err.message });
    })
}

// Get any user's details 
exports.getUserDetails = (req, res) => {
  let userData ={}; 

  store.doc(`/users/${req.params.handle}`).get()
  .then((document) => {
    if ( document.exists ) {
      userData.user = document.data(); 

      return store.collection('posts')
      .where('userHandle', '==', req.params.handle)
      .orderBy('createdAt', 'desc')
      .get();
    } else {
      return res.status(404).json({ error: 'User not found.'})
    }
  })
  .then((data) => {
    userData.posts = []; 

    data.forEach((doc) => {
      userData.posts.push({
        body: doc.data().body,
        createdAt: doc.data().createdAt,
        userHandle: doc.data().userHandle,
        userImage: doc.data().userImage,
        likeCount: doc.data().likeCount,
        commentCount: doc.data().commentCount,
        _post_id: doc.id
      })
    })
    return res.json(userData); 
  })
  .catch(err => {
    console.error(err); 
    return res.status(500).json({ error: err.code + ': ' + err.message})
  })
}

// Upload user profile picture 
exports.uploadImage = (req, res) => {
  const Busboy = require('busboy');
  const busboy = Busboy({ headers: req.headers });
  const path = require('path');
    const os = require('os');
    const fs = require('fs');

  let imageFilename, imageToBeUploaded = {};

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(fieldname, filename, mimetype);
      const imageMimetype = filename.mimetype;
      
      if (filename.mimeType !== 'image/jpeg' && filename.mimeType !== 'image/png') {
          return res.status(400).json({ error: 'Wrong file type submitted.' });
      }

      const imageExtension = filename.filename.split('.')[filename.filename.split('.').length - 1];

      imageFilename = `${Math.round(Math.random() * 100000000)}.${imageExtension}`;
      
      const filePath = path.join(os.tmpdir(), imageFilename); 

      console.log(filePath)

      imageToBeUploaded = { filePath, imageMimetype }

      file.pipe(fs.createWriteStream(filePath))

      busboy.on('finish', () => {
          admin.storage().bucket(config.storageBucket).upload(imageToBeUploaded.filePath, {
            resumable: false,
            metadata: {
              contentType: mimetype,
            },
          })
          .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${encodeURIComponent(imageFilename)}?alt=media`;
            return admin.firestore().doc(`/users/${req.user.handle}`).update({ imageUrl });
          })
          .then(() => {
            return res.json({ message: 'Image uploaded successfully' });
          })
          .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
          });
        });
      
        req.pipe(busboy);
  })
  busboy.end(req.rawBody);
}

exports.markNotificationsRead = (req, res) => {
  let batch = store.batch(); 
  req.body.forEach((notificationId) => {
    const notification = store.doc(`/notifications/${notificationId}`); 
    batch.update(notification, { read: true })
  }); 
  batch.commit()
  .then(() => {
    return res.json({ message: 'Notifications marked read.'})
  })
  .catch(err => {
    console.error(err); 
    return res.status(500).json({error : err.code + ': ' + err.message});
  })
}