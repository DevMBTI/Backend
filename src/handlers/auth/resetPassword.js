const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const { userPool, handleCognitoError } = require('../../utils/authUtils');
const { success, error, validateInput } = require('../../utils/middleware');
const { resetPasswordSchema } = require('../../utils/validation');

/**
 * 비밀번호 재설정 핸들러
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
    const { valid, errors } = validateInput(resetPasswordSchema, requestBody);
    if (!valid) {
      return error(400, '유효성 검증에 실패했습니다.', errors);
    }
    
    const { email, confirmationCode, newPassword } = requestBody;
    
    // 사용자 생성
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    
    // 비밀번호 재설정 처리
    return new Promise((resolve) => {
      cognitoUser.confirmPassword(confirmationCode, newPassword, {
        onSuccess: () => {
          // 성공
          resolve(success({
            message: '비밀번호가 성공적으로 재설정되었습니다. 이제 새 비밀번호로 로그인할 수 있습니다.'
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