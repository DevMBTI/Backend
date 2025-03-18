const Joi = require('joi');

// analyzeResults 핸들러 입력 검증
const analyzeResultsSchema = Joi.object({
  userName: Joi.string().allow('', null),
  answers: Joi.object().required()
}).unknown(false);

// generateQuestion 핸들러 입력 검증
const generateQuestionSchema = Joi.object({
  category: Joi.string().valid('frontend', 'backend', 'fullstack', 'data', 'devops', 'mobile', 'security', 'gamedev', 'embedded', 'ai').required(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium')
}).unknown(false);

// 회원가입 입력 검증
const signUpSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().max(100).optional()
}).unknown(false);

// 로그인 입력 검증
const signInSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
}).unknown(false);

// 회원가입 확인 검증
const confirmSignUpSchema = Joi.object({
  email: Joi.string().email().required(),
  confirmationCode: Joi.string().required()
}).unknown(false);

// 비밀번호 재설정 요청 검증
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
}).unknown(false);

// 비밀번호 재설정 검증
const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  confirmationCode: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
}).unknown(false);

// 입력 검증 함수
function validateInput(schema, data) {
  const validation = schema.validate(data, { abortEarly: false });
  
  if (validation.error) {
    const errors = validation.error.details.map(detail => ({
      message: detail.message,
      path: detail.path
    }));
    
    return {
      valid: false,
      errors
    };
  }
  
  return {
    valid: true,
    value: validation.value
  };
}

module.exports = {
  validateInput,
  analyzeResultsSchema,
  generateQuestionSchema,
  signUpSchema,
  signInSchema,
  confirmSignUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema
}; 