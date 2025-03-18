const AWS = require('aws-sdk');
const { success, error } = require('../../utils/middleware');

/**
 * 사용자 정보 가져오기 핸들러
 * 이 함수는 Cognito 인증이 필요한 보호된 엔드포인트입니다.
 */
exports.handler = async (event) => {
  try {
    // API Gateway에서 전달된 사용자 정보
    const { authorizer } = event.requestContext;
    
    if (!authorizer || !authorizer.claims) {
      return error(401, '인증 정보가 없습니다.');
    }
    
    // Cognito 사용자 클레임
    const { sub, email, name, 'cognito:groups': groups } = authorizer.claims;
    
    // 그룹 정보 정리
    const userGroups = groups ? (Array.isArray(groups) ? groups : [groups]) : [];
    
    return success({
      userId: sub,
      email,
      name: name || null,
      groups: userGroups,
      isAdmin: userGroups.includes('admin')
    });
  } catch (err) {
    console.error('사용자 정보 조회 오류:', err);
    return error(500, '사용자 정보를 가져오는 중 오류가 발생했습니다.');
  }
}; 