let { isRequestDataValid } = require('./appUtils')

exports.validator = (body, method, model) =>{
	try{
		if(model === 'Package' && method === 'post'){
      let {
        name, 
        expertId, 
        expertiseId, 
        price,
        packageDurationInWeeks,
        sessionCount, 
        isActive
      } = body
      let requiredFields = {
        name, 
        expertId, 
        expertiseId, 
        price, 
        packageDurationInWeeks,
        sessionCount, 
        isActive
      }
      return isRequestDataValid(requiredFields, '1234')
		} else if(model === 'Gallery' && method === 'post'){
      let {
        expertiseId, 
        name, 
        mediaLink, 
        mediaType, 
      } = body
      let requiredFields = {
        expertiseId, 
        name, 
        mediaLink, 
        mediaType, 
      }
      return isRequestDataValid(requiredFields, '1234')
    }
    return true
	}catch(e){
		console.log(e, 'e')
		throw e
	}
}