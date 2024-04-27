let db = {
    user : [
        {
            userId: '', 
            email: '', 
            handle: '', 
            createdAt: '', 
            imageUrl : '', 
            bio: '', 
            website: '', 
            location: '',
        }
    ],
    posts: [
        {
            userHandle: 'User', 
            body: 'Body', 
            createdAt: '2024-04-20T16:48:58.476Z', 
            likeCount: 0, 
            commentCount: 0,
        }
    ], 
    comments : [
        {
            userHandle: 'User', 
            postId: '',
            body: 'Body', 
            createdAt: '2024-04-20T16:48:58.476Z', 
            likeCount: 0, 
        }
    ], 
    notification : [
        {
            recipient: '', 
            sender: '', 
            read: 'true | false', 
            postId: 'ID', 
            type: 'like | comment | announcement', 
            createdAt: 'Date'
        }
    ]
}

const userDetails = {
    // Redux data 
    credentials: {
        userId: '', 
        email: '', 
        handle: '', 
        createdAt: '', 
        imageUrl : '', 
        bio: '', 
        website: '', 
        location: '', 
    },
    likes: [ // Posts liked by the user
        {
            userHandle: '', // Handle of the user who liked the post (current user)
            postId: '' // ID of the liked post
        }, 
        {
            userHandle: '', 
            postId: ''
        }
    ]
}