const { store } = require('../utils/admin')

/**
 * Retrieves all posts from database 
 * @param {*} req 
 * @param {*} res 
 */
exports.getAllPosts = async (req, res) => {
  const postsRef = store.collection('posts');
  let query = postsRef.orderBy('createdAt');
  query
    .get()
    .then(data => {
      let posts = [];
      data.forEach(doc => {
        posts.push({
          _post_id: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          userImage: doc.data().userImage, 
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount
        });
      });

      console.log(posts);
      return res.json(posts);
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: 'Unable to fetch posts' });
    });
}

/**
 * Adds post to database. Requires non empty post. 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.createPost = ( req, res ) => {
    if ( req.body.body.trim() === '' ) {
      return res.status(400).json({ body: 'Body must not be empty.' })
    }
  
    const newPost = {
      body: req.body.body, 
      userHandle: req.user.handle, 
      userImage: req.user.imageUrl,
      createdAt: new Date().toISOString(), 
      likeCount: 0, 
      commentCount: 0
    }
  
    store.collection('posts')
    .add(newPost)
    .then(( doc ) => {
      const resPost = newPost; 
      resPost.postId = doc.id;

      res.json({message : `document ${doc.id} created successfully.`})
    })
    .catch(err => {
      console.log(err); 
      res.status(500).json({ error: 'Something went wrong.' })
    })
  
}

exports.getPost = (req, res) => {
  let postData = {}

  store.doc(`/posts/${req.params.postId}`).get()
  .then(( doc ) => {
    if ( !doc.exists ) {
      return res.status(404).json({ error: 'Post not found.'})
    } 

    postData = doc.data();
    postData.postId = doc.id; 

    return store.collection('comments')
    .orderBy('createdAt', 'desc')
    .where('postId', '==', req.params.postId).get(); 
  })
  .then((data) => {
    postData.comments = []; 

    data.forEach((doc) => {
      postData.comments.push(doc.data())
    })

    return res.json(postData); 
  })
  .catch( err => {
    console.log(err); 
    return res.status(500).json({ error: err.code + ": " + err.message });
  })
}

exports.commentOnPost = (req, res) => {
  if ( req.body.body.trim() === '') return res.status(400).json({ comment : 'Must not be empty. '})

  const newComment = {
    body: req.body.body, 
    createdAt: new Date().toISOString(), 
    postId: req.params.postId, 
    userHandle: req.user.handle, 
    userImage: req.user.imageUrl
  }

  store.doc(`/posts/${req.params.postId}`).get()
  .then(( doc ) => {
    if ( !doc.exists ) {
      return res.status(404).json({ error: 'Post not found.'})
    }
    return doc.ref.update({ commentCount: doc.data().commentCount + 1})
  })
  .then (() => {
    return store.collection('comments')
    .add(newComment)
  })
  .then(() => {
    return res.json(newComment)
  })
  .catch( err => {
    console.log(err); 
    return res.status(500).json({ error: err.code + ": " + err.message });
  })

}

exports.likePost = (req, res) => {
  const likeDoc = store.collection('likes')
                  .where('userHandle', "==", req.user.handle)
                  .where('postId', '==', req.params.postId)
                  .limit(1); 
  
  const postDoc = store.doc(`/posts/${req.params.postId}`)

  let postData = {}; 

  postDoc.get()
  .then(( doc ) => {
    if ( doc.exists ) {
      postData = doc.data(); 
      postData.postId = doc.id; 
      return likeDoc.get(); 
    } else {
      return res.status(404).json({ error: 'Post not found.'})
    }
  })
  .then(( data ) => {
    if ( data.empty ) {
      return store.collection('likes')
      .add({
        postId: req.params.postId, 
        userHandle: req.user.handle
      })
      .then(() => {
        postData.likeCount++;
        return postDoc.update({
          likeCount: postData.likeCount
        })
        .then(() => {
          return res.json(postData)
        })
      })
    } else {
      return res.status(400).json({ error: 'Post already liked.'})
    }
  })
  .catch( err => {
    console.log(err); 
    return res.status(500).json({ error: err.code + ": " + err.message });
  })
}

exports.unlikePost = (req, res) => {
  const likeDoc =store.collection('likes')
                  .where('userHandle', "==", req.user.handle)
                  .where('postId', '==', req.params.postId)
                  .limit(1); 
  
  const postDoc = store.doc(`/posts/${req.params.postId}`)

  let postData = {}; 

  postDoc.get()
  .then(( doc ) => {
    if ( doc.exists ) {
      postData = doc.data(); 
      postData.postId = doc.id; 
      return likeDoc.get(); 
    } else {
      return res.status(404).json({ error: 'Post not found.'})
    }
  })
  .then(( data ) => {
    if ( data.docs[0] == undefined ) {
      return res.status(400).json({ error: 'Post not already liked.'})
    } else {

      return store.doc(`/likes/${data.docs[0].id}`).delete()
      .then(() => {
        postData.likeCount--; 
        return postDoc.update({ 
          likeCount: postData.likeCount
        }); 
      })
      .then(() => {
        res.json(postData)
      })
    }
  })
  .catch( err => {
    console.log(err); 
    return res.status(500).json({ error: err.code + ": " + err.message });
  })
}

exports.deletePost = (req, res) => {
  const document = store.doc(`/posts/${req.params.postId}`); 

  document.get()
  .then((doc) => {
    if (! doc.exists) {
      return res.status(400).json({ error : 'Post not found.'})
    } else {
      if ( doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: 'Unauthorized access.'});
      } else {
        return document.delete()
        .then(() => {
          res.json({ message: 'Post deleted successfully.'})
        })
      }
    }
  })
  .catch(err => {
    console.log(err); 
    return res.status(500).json({ error: err.code + ": " + err.message });
  })
}