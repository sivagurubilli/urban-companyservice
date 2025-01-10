
// Middleware to check the HTTP method
exports.isValidGetMethod = (req, res, next) => {
    try {
        if (req.method !== 'GET') throw { status: 405,  message: 'method_not_found' }
        next();
    }
    catch (error) {
       next(error)
    }
};

// Middleware to check the HTTP method
exports.isValidPostMethod = (req, res, next) => {
    try {
        if (req.method !== 'POST') throw { status: 405,  message: 'method_not_found' }
        next();
    }
    catch (error) {
       next(error)
        }
};

// Middleware to check the HTTP method
exports.isValidPutMethod = (req, res, next) => {
    try {
        if (req.method !== 'PUT') throw { status: 405, message: 'method_not_found' }
        next();
    }
    catch (error) {
       next(error)
    }
};

// Middleware to check the HTTP method
exports.isValidDeleteMethod = (req, res, next) => {
    try {
        if (req.method !== 'DELETE') throw { status: 405,  message: 'method_not_found' }
        next();
    }
    catch (error) {
        next(error)
    }
};
