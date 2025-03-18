const AWS = require('aws-sdk');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const { success, error, logError } = require('./middleware');

// Cognito 구성
const poolData = {
  UserPoolId: process.env.COGNITO_USER_POOL_ID,  // 배포 후 자동으로 업데이트될 값
  ClientId: process.env.COGNITO_CLIENT_ID  // 배포 후 자동으로 업데이트될 값
};

// Cognito 사용자 풀 클라이언트 생성
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

// 사용자 속성 생성 함수
const createCognitoAttribute = (name, value) => {
  return new AmazonCognitoIdentity.CognitoUserAttribute({
    Name: name,
    Value: value
  });
};

// 에러 핸들링 함수
const handleCognitoError = (err) => {
  logError('Cognito 오류', err);
  
  // 일반적인 Cognito 오류 메시지 매핑
  const errorMessages = {
    'UserNotFoundException': '존재하지 않는 사용자입니다.',
    'NotAuthorizedException': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'UsernameExistsException': '이미 등록된 이메일 주소입니다.',
    'CodeMismatchException': '인증 코드가 올바르지 않습니다.',
    'ExpiredCodeException': '인증 코드가 만료되었습니다.',
    'InvalidPasswordException': '비밀번호는 8자 이상이어야 하며, 대문자, 소문자, 숫자를 포함해야 합니다.',
    'LimitExceededException': '요청 횟수가 제한을 초과했습니다. 잠시 후 다시 시도해주세요.'
  };
  
  const errorCode = err.code || err.name;
  const errorMessage = errorMessages[errorCode] || err.message || '인증 처리 중 오류가 발생했습니다.';
  
  return error(400, errorMessage, { code: errorCode });
};

module.exports = {
  userPool,
  createCognitoAttribute,
  handleCognitoError
}; 