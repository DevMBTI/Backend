const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const { userPool, handleCognitoError } = require('../../utils/authUtils');
const { success, error, validateInput } = require('../../utils/middleware');
const { forgotPasswordSchema } = require('../../utils/validation');

/**
 * 비밀번호 찾기 핸들러
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
    const { valid, errors } = validateInput(forgotPasswordSchema, requestBody);
    if (!valid) {
      return error(400, '유효성 검증에 실패했습니다.', errors);
    }
    
    const { email } = requestBody;
    
    // 사용자 생성
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    
    // 비밀번호 찾기 처리
    return new Promise((resolve) => {
      cognitoUser.forgotPassword({
        onSuccess: (data) => {
          // 성공
          resolve(success({
            message: '비밀번호 재설정 코드가 이메일로 전송되었습니다.',
            data: data
          }));
        },
        onFailure: (err) => {
          resolve(handleCognitoError(err));
        }
      });
    });
  } catch (err) {
    return handleCognitoError(err);
  }
}; 