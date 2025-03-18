const createResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*', // 프로덕션에서는 특정 도메인으로 제한하세요
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
};

const success = (data) => createResponse(200, data);

const error = (statusCode, message, details = null) => {
  const errorBody = {
    error: message
  };
  
  if (details) {
    errorBody.details = details;
  }
  
  return createResponse(statusCode, errorBody);
};

const validateInput = (schema, data) => {
  if (!schema) return { valid: true };
  
  try {
    const { error: validationError } = schema.validate(data, { abortEarly: false });
    
    if (validationError) {
      const details = validationError.details.map(err => ({
        message: err.message,
        path: err.path
      }));
      
      return {
        valid: false,
        errors: details
      };
    }
    
    return { valid: true };
  } catch (e) {
    console.error('Validation error:', e);
    return {
      valid: false,
      errors: [{ message: 'Validation failed', error: e.message }]
    };
  }
};

const logError = (context, error) => {
  console.error({
    timestamp: new Date().toISOString(),
    context,
    error: error.message,
    stack: error.stack
  });
};

module.exports = {
  success,
  error,
  validateInput,
  logError
}; 