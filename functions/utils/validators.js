const isEmpty = ( string ) => {
    if ( string == undefined ) return true;
    if ( string.trim() === '' ) return true; 
    else return false;
  }
  
const isEmail = ( email ) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if ( email.match(regEx) ) return true; 
    else return false;
}

exports.validateSignupData = ( data ) => {
        // VALIDATE DATA
        let errors = {}
        if ( isEmpty ( data.email ) ) {
          errors.email = 'Must not be empty.'
        } else if ( !isEmail(data.email) ) {
          errors.email = 'Must be a valid email address.'
        }
      
        if ( isEmpty( data.password ) ) errors.password = 'Must not be empty.'

        if ( data.password.length < 6 ) errors.password = 'Must be 6 characters or more.'
      
        if( data.password !== data.confirmPassword ) errors.confirmPassword = 'Passwords must match.'
      
        if ( isEmpty( data.handle ) ) errors.handle = 'Must not be empty.'

        if ( /[\s]/.test(data.handle) ) errors.handle = 'Username cannot contain spaces.'

        return { 
            errors, 
            valid: Object.keys(errors).length === 0 ? true : false
        }
}
 
exports.validateLoginData = ( data ) => {
    let errors = {}
  
    if (isEmpty(data.email)) errors.email = 'Must not be empty.'
    if (isEmpty(data.password)) errors.password = 'Must not be empty.'

    return { 
        errors, 
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.reduceUserDetails = ( data ) => {
  let userDetails = {}

  if ( !isEmpty(data.bio) ) userDetails.bio = data.bio;
  if ( !isEmpty(data.website) ) {
    if ( data.website.trim().substring(0, 4) !== 'http' ) {
      userDetails.website = `http://${data.website.trim()}`
    } else {
      userDetails.website = data.website; 
    }
  } 
  if ( !isEmpty(data.location) ) userDetails.location = data.location;

  if ( !isEmpty(data.imageUrl) ) userDetails.imageUrl = data.imageUrl;

  if( !isEmpty(data.handle) ) userDetails.handle = data.handle;

  return userDetails; 
}