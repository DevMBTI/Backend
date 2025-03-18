const { userPool, createCognitoAttribute, handleCognitoError } = require('../../utils/authUtils');
const { success, error, validateInput } = require('../../utils/middleware');
const { signUpSchema } = require('../../utils/validation');

/**
 * 회원가입 핸들러
 */
exports.handler = async (event) => {
  try {
    // 요청 본문 파싱
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (e) {
      return error(400, '요청 본문이 유효하지 않습니다.');
    }
    
    // 입력 유효성 검증
    const { valid, errors } = validateInput(signUpSchema, requestBody);
    if (!valid) {
      return error(400, '유효성 검증에 실패했습니다.', errors);
    }
    
    const { email, password, name } = requestBody;
    
    // 사용자 속성 설정
    const attributeList = [];
    
    if (name) {
      attributeList.push(createCognitoAttribute('name', name));
    }
    
    // 회원가입 처리
    return new Promise((resolve) => {
      userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) {
          resolve(handleCognitoError(err));
          return;
        }
        
        // 회원가입 성공
        resolve(success({
          message: '회원가입에 성공했습니다. 이메일을 확인하여 계정을 인증해주세요.',
          userSub: result.userSub,
          userConfirmed: result.userConfirmed
        }));
      });
    });
  } catch (err) {
    return handleCognitoError(err);
  }
}; 