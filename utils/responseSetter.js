exports.responseSetter = (body, method, model) => {
	if(model == 'User' && method=="put"){
		body.password = undefined
		body.token = undefined
		body.isVerified = undefined
	}
	return body
}