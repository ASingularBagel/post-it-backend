const { getAuth } = require('firebase/auth');
const config  = require('./utils/config')
const FBauth  = require('./utils/fbAuth')
const { functions, store } = require('./utils/admin')

const firebase = require('firebase/app')
require('firebase/auth')

firebase.initializeApp(config);

const app = require('express')(); 
const cors = require('cors');
app.use(cors());

const {onRequest} = require("firebase-functions/v2/https");

// Post functions 
const { 
  getAllPosts, 
  createPost, 
  getPost, 
  commentOnPost, 
  likePost, 
  unlikePost, 
  deletePost
} = require('./handlers/posts');

// User functions
const { 
  signup, 
  login, 
  uploadImage, 
  addUserDetails, 
  getAuthenticatedUser, 
  getUserDetails, 
  markNotificationsRead
} = require('./handlers/users');

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

// Get all posts route
app.get('/posts', getAllPosts);

// Create new post route
app.post('/post', FBauth, createPost);

// Get post 
app.get('/post/:postId', getPost);

// Delete post 
app.delete('/post/:postId', FBauth, deletePost);
// Like post 
app.get('/post/:postId/like', FBauth, likePost); 
// Unlike post 
app.get('/post/:postId/unlike', FBauth, unlikePost); 
// Comment on post 
app.post('/post/:postId/comment', FBauth, commentOnPost);

// Sign up 
app.post('/signup', signup);

// Login 
app.post('/login', login);

// Upload image
app.post('/user/image', FBauth, uploadImage);

// Set User details 
app.post('/user', FBauth, addUserDetails); 

// Get User details
app.get('/user', FBauth, getAuthenticatedUser)

app.get('/user/:handle', getUserDetails);

app.post('/notifications', FBauth, markNotificationsRead);

exports.api = onRequest(app); 

exports.createNotificationOnLike = functions.firestore.document('/likes/{id}')
  .onCreate((snapshot) => {
    return store.doc(`posts/${snapshot.data().postId}`).get()
    .then(( doc ) => {
      if ( doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
        return store.doc(`/users/${snapshot.data().userHandle}`).get()
        .then((userDoc) => {
          if (userDoc.exists) {
            return store.doc(`/notifications/${snapshot.id}`).set({
              createdAt: new Date().toISOString(), 
              recipient: doc.data().userHandle, 
              sender: snapshot.data().userHandle, 
              imageUrl: userDoc.data().imageUrl,
              postId: doc.id, 
              read: false, 
              type: 'like', 
            })
          }
        })
      }
    })
    .catch(err => {
      console.error(err); 
      return;
    })
  })

exports.deleteNotificationOnUnlike = functions.firestore.document('/likes/{id}')
  .onDelete((snapshot) => {
    return store.doc(`/notifications/${snapshot.id}`)
    .delete()
    .catch(err => {
      console.error(err); 
      return;
    })
  })

  exports.createNotificationOnComment = functions.firestore.document('/comments/{id}')
  .onCreate((snapshot) => {
    return store.doc(`posts/${snapshot.data().postId}`).get()
    .then(( doc ) => {
      if ( doc.exists && doc.data().userHandle !== snapshot.data().userHandle ) {
        return store.doc(`/users/${snapshot.data().userHandle}`).get()
        .then((userDoc) => {
          if (userDoc.exists) {
            return store.doc(`/notifications/${snapshot.id}`).set({
              createdAt: new Date().toISOString(), 
              recipient: doc.data().userHandle, 
              sender: snapshot.data().userHandle, 
              imageUrl: userDoc.data().imageUrl,
              postId: doc.id, 
              read: false, 
              type: 'comment', 
            })
          }
        })
      }
    })
    .catch(err => {
      console.error(err); 
      return;
    })
  })

exports.onUserImageChange = functions.firestore.document("users/{userId}")
.onWrite ((change) => {
  const before = change.before.data();
  const after = change.after.data();
  console.log(before); 
  console.log(after);

  if (!before || !after) {
    console.log('Failed to fetch snapshots.')
    return;
  }; 

  if ( before.imageUrl !== after.imageUrl ) {
    console.log('Image change logged.')
    const batch = store.batch(); 
    return store.collection('posts')
          .where('userHandle', '==', before.handle).get()
    .then(async data => {
      data.forEach( doc => {
        const post = store.doc(`posts/${doc.id}`); 
        batch.update( post, { userImage: after.imageUrl });
      })
      
      return store.collection('comments')
          .where('userHandle', '==', before.handle).get() 
    })
    .then(async data => {
      data.forEach( doc => {
        const comment = store.doc(`comments/${doc.id}`); 
        batch.update( comment, { userImage: after.imageUrl });
      })

      return store.collection('notifications')
      .where('sender', '==', before.handle).get(); 
    })
    .then(async data => {
      data.forEach( doc => {
        const notification = store.doc(`notifications/${doc.id}`); 
        batch.update( notification, { imageUrl: after.imageUrl });
      })

      await batch.commit();
    })
    .catch( err => {
      console.error('Failed to update posts:', err);
      throw new functions.https.HttpsError('internal', 'Failed to update posts', err);
    })

  } else {
    console.log('No change in image detected.');
  }
})

exports.onPostDelete = functions.firestore.document('/posts/{postId}')
  .onDelete((snapshot, context) => {
    const postId = context.params.postId; 
    const batch = store.batch(); 

    return store.collection('comments')
    .where('postId', '==', postId).get()
    .then( async data => {
      data.forEach( doc => {
        batch.delete(store.doc(`/comments/${doc.id}`)); 
      })

      return store.collection('likes')
      .where('postId', '==', postId).get()
    })
    .then( async data => {
      data.forEach( doc => {
        batch.delete(store.doc(`/likes/${doc.id}`)); 
      })

      return store.collection('notifications')
      .where('postId', '==', postId).get()
    })
    .then( async data => {
      data.forEach( doc => {
        batch.delete(store.doc(`/notifications/${doc.id}`)); 
      })

      return await batch.commit();
    })
    .catch( err => {
      console.error(err); 
    })
  })