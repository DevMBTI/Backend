const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const { userPool, handleCognitoError } = require('../../utils/authUtils');
const { success, error, validateInput } = require('../../utils/middleware');
const { confirmSignUpSchema } = require('../../utils/validation');

/**
 * 회원가입 확인 핸들러
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
    const { valid, errors } = validateInput(confirmSignUpSchema, requestBody);
    if (!valid) {
      return error(400, '유효성 검증에 실패했습니다.', errors);
    }
    
    const { email, confirmationCode } = requestBody;
    
    // 사용자 생성
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    
    // 회원가입 확인 처리
    return new Promise((resolve) => {
      cognitoUser.confirmRegistration(confirmationCode, true, (err, result) => {
        if (err) {
          resolve(handleCognitoError(err));
          return;
        }
        
        // 확인 성공
        resolve(success({
          message: '회원가입 확인에 성공했습니다. 이제 로그인할 수 있습니다.',
          result: result
        }));
      });
    });
  } catch (err) {
    return handleCognitoError(err);
  }
}; 