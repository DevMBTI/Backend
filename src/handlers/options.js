require('dotenv').config();

exports.handler = async (event) => {
  // 요청의 origin 헤더를 확인
  const origin = event.headers.origin || event.headers.Origin || '*';
  
  // 허용할 오리진 목록
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://jl48vljji8.execute-api.ap-northeast-2.amazonaws.com',
    '*'
  ];
  
  // 요청 오리진이 허용 목록에 있는지 확인
  const allowOrigin = allowedOrigins.includes(origin) ? origin : '*';
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Access-Control-Allow-Origin'
    },
    body: JSON.stringify({})
  };
}; 