const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const { userPool, handleCognitoError } = require('../../utils/authUtils');
const { success, error, validateInput } = require('../../utils/middleware');
const { signInSchema } = require('../../utils/validation');

/**
 * 로그인 핸들러
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
    const { valid, errors } = validateInput(signInSchema, requestBody);
    if (!valid) {
      return error(400, '유효성 검증에 실패했습니다.', errors);
    }
    
    const { email, password } = requestBody;
    
    // 인증 세부 정보 설정
    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: email,
      Password: password
    });
    
    // 사용자 생성
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    
    // 로그인 처리
    return new Promise((resolve) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session) => {
          // 로그인 성공
          resolve(success({
            message: '로그인에 성공했습니다.',
            idToken: session.getIdToken().getJwtToken(),
            accessToken: session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
            expiresIn: session.getIdToken().getExpiration() - Math.floor(Date.now() / 1000)
          }));
        },
        onFailure: (err) => {
          resolve(handleCognitoError(err));
        },
        // 새 비밀번호 요구 처리
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          resolve(error(400, '비밀번호를 변경해야 합니다.', {
            code: 'NewPasswordRequired',
            userAttributes,
            requiredAttributes
          }));
        }
      });
    });
  } catch (err) {
    return handleCognitoError(err);
  }
}; 