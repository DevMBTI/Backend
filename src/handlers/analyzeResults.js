// analyzeResults.js
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const { pathDescriptions } = require('../utils/constants');
const { success, error, validateInput, logError } = require('../utils/middleware');
const { analyzeResultsSchema } = require('../utils/validation');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
require('dotenv').config();

exports.handler = async (event) => {
  try {
    // 요청 본문 파싱
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (e) {
      return error(400, 'Invalid request body. JSON parsing failed.'); 
    }
    
    // 입력 유효성 검증
    const { valid, errors } = validateInput(analyzeResultsSchema, requestBody);
    if (!valid) {
      return error(400, 'Validation failed', errors);
    }
    
    const { answers, userName = 'Anonymous' } = requestBody;
    
    // 분석 로직 실행
    const result = analyzeResults(answers);
    
    // 결과 저장
    const timestamp = new Date().toISOString();
    const id = uuidv4();
    
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        id,
        userName,
        answers,
        result,
        createdAt: timestamp,
        updatedAt: timestamp
      },
    };
    
    await dynamoDb.put(params).promise();
    
    // 성공 응답 반환
    return success({
      id,
      result,
    });
  } catch (error) {
    logError('analyzeResults handler', error);
    return error(500, 'Could not analyze results', { message: error.message });
  }
};

// 분야별 특성과 연관된 키워드/성향
const fieldTraits = {
  frontend: ['시각적', '디자인', 'UI', 'UX', '사용자 중심', '창의적', '직관적'],
  backend: ['논리적', '시스템', '구조', '알고리즘', '성능', '확장성', '안정성'],
  fullstack: ['다재다능', '융통성', '적응력', '통합', '균형', '전체적', '소통'],
  data: ['분석적', '패턴', '통계', '정확성', '예측', '데이터', '통찰력'],
  devops: ['자동화', '효율성', '도구', '운영', '모니터링', '인프라', '배포'],
  mobile: ['사용자 경험', '터치 인터페이스', '반응형', '크로스 플랫폼', '앱 최적화', '화면 적응성', '모바일 중심'],
  security: ['보안 의식', '취약점 분석', '방어적 사고', '암호화', '안전성', '리스크 관리', '데이터 보호'],
  gamedev: ['창의성', '상호작용', '물리 엔진', '3D 공간', '사용자 몰입', '게임 로직', '시각적 표현'],
  embedded: ['하드웨어 이해', '저수준 최적화', '제한된 자원', '실시간 처리', '안정성', '펌웨어', '장치 제어'],
  ai: ['패턴 인식', '기계학습', '알고리즘 설계', '데이터 모델링', '신경망', '예측 분석', '자연어 처리']
};

// 질문/답변 매핑 데이터
// 각 질문 ID에 대해 특정 답변이 어떤 분야에 얼마나 기여하는지 정의
const questionMapping = {
  'q1': [
    { frontend: 2.0, fullstack: 0.5 },  // 첫 번째 답변 (0번)
    { backend: 2.0, data: 0.5 },        // 두 번째 답변 (1번)
    { fullstack: 2.0, devops: 0.5 },    // 세 번째 답변 (2번)
    { data: 2.0, devops: 1.0 }          // 네 번째 답변 (3번)
  ],
  'q2': [
    { data: 2.0, backend: 0.5 },
    { frontend: 2.0, fullstack: 0.5 },
    { devops: 2.0, fullstack: 0.5 },
    { backend: 2.0, devops: 0.5 }
  ],
  'q3': [
    { frontend: 1.5, data: 0.5 },
    { backend: 1.5, devops: 0.5 },
    { fullstack: 1.5, frontend: 0.5 },
    { data: 1.5, backend: 0.5 }
  ],
  // 추가 질문에 대한 매핑...
};

// 개선된 analyzeResults 함수
function analyzeResults(answers) {
  // 초기 점수 설정
  let scores = {
    frontend: 0,
    backend: 0,
    fullstack: 0,
    data: 0,
    devops: 0,
    mobile: 0,
    security: 0,
    gamedev: 0,
    embedded: 0,
    ai: 0
  };
  
  // 답변 가중치 적용
  Object.entries(answers).forEach(([questionId, answer]) => {
    // 매핑 데이터가 있는 경우 사용
    if (questionMapping[questionId] && questionMapping[questionId][answer]) {
      const mappingData = questionMapping[questionId][answer];
      Object.entries(mappingData).forEach(([field, weight]) => {
        scores[field] += weight;
      });
    } else {
      // 매핑 데이터가 없는 경우 기본 가중치 적용
      const defaultDistribution = [
        { frontend: 1.0, backend: 0.3, fullstack: 0.5, data: 0.2, devops: 0.1, mobile: 0.8, security: 0.2, gamedev: 0.6, embedded: 0.3, ai: 0.2 },
        { frontend: 0.3, backend: 1.0, fullstack: 0.5, data: 0.3, devops: 0.2, mobile: 0.3, security: 0.7, gamedev: 0.2, embedded: 0.6, ai: 0.4 },
        { frontend: 0.5, backend: 0.5, fullstack: 1.0, data: 0.3, devops: 0.3, mobile: 0.5, security: 0.5, gamedev: 0.4, embedded: 0.4, ai: 0.3 },
        { frontend: 0.2, backend: 0.3, fullstack: 0.3, data: 1.0, devops: 0.5, mobile: 0.2, security: 0.3, gamedev: 0.2, embedded: 0.3, ai: 0.9 },
        { frontend: 0.1, backend: 0.2, fullstack: 0.3, data: 0.5, devops: 1.0, mobile: 0.1, security: 0.5, gamedev: 0.1, embedded: 0.4, ai: 0.3 },
        { frontend: 0.8, backend: 0.3, fullstack: 0.5, data: 0.2, devops: 0.1, mobile: 1.0, security: 0.3, gamedev: 0.6, embedded: 0.4, ai: 0.2 },
        { frontend: 0.2, backend: 0.7, fullstack: 0.5, data: 0.3, devops: 0.5, mobile: 0.3, security: 1.0, gamedev: 0.2, embedded: 0.5, ai: 0.3 },
        { frontend: 0.6, backend: 0.2, fullstack: 0.4, data: 0.2, devops: 0.1, mobile: 0.6, security: 0.2, gamedev: 1.0, embedded: 0.3, ai: 0.5 },
        { frontend: 0.3, backend: 0.6, fullstack: 0.4, data: 0.3, devops: 0.4, mobile: 0.4, security: 0.5, gamedev: 0.3, embedded: 1.0, ai: 0.3 },
        { frontend: 0.2, backend: 0.4, fullstack: 0.3, data: 0.9, devops: 0.3, mobile: 0.2, security: 0.3, gamedev: 0.5, embedded: 0.3, ai: 1.0 }
      ];
      
      const distribution = defaultDistribution[answer % defaultDistribution.length];
      if (distribution) {
        Object.entries(distribution).forEach(([field, weight]) => {
          scores[field] += weight;
        });
      }
    }
  });
  
  // 점수 정규화 (0-100 범위로)
  const totalQuestions = Object.keys(answers).length;
  // 최대 가능 점수 계산 (정확한 계산이 필요할 경우 조정)
  const maxPossibleScore = totalQuestions * 2;
  
  Object.keys(scores).forEach(key => {
    // 0-100 범위로 변환하되 최소 10점, 최대 95점으로 제한 (극단적 결과 방지)
    const normalizedScore = (scores[key] / maxPossibleScore) * 100;
    scores[key] = Math.max(10, Math.min(95, Math.round(normalizedScore)));
  });
  
  // 보정: 너무 균등한 점수 분포 방지 (결과의 명확성을 위해)
  const scoreValues = Object.values(scores);
  const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  const scoreVariance = scoreValues.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scoreValues.length;
  
  // 분산이 낮으면 (점수가 너무 비슷하면) 점수 차이를 좀 더 벌림
  if (scoreVariance < 50) {
    const amplifier = 1.5; // 점수 차이 증폭 계수
    
    Object.keys(scores).forEach(key => {
      const diff = scores[key] - avgScore;
      scores[key] = Math.max(10, Math.min(95, Math.round(avgScore + diff * amplifier)));
    });
  }
  
  // 최고 점수 분야 찾기
  const maxScore = Math.max(...Object.values(scores));
  const recommendedPaths = Object.keys(scores).filter(key => scores[key] === maxScore);
  const primaryRecommendation = recommendedPaths[0];
  
  // 두 번째로 높은 점수 찾기
  const secondaryScores = {...scores};
  delete secondaryScores[primaryRecommendation];
  const secondMaxScore = Math.max(...Object.values(secondaryScores));
  const secondaryPaths = Object.keys(secondaryScores).filter(key => secondaryScores[key] === secondMaxScore);
  const secondaryRecommendation = secondaryPaths[0];
  
  // 성향 분석 (상위 5개 성향 특성 선택)
  const traits = [];
  // 주요 분야의 특성에서 3개 선택
  const primaryTraits = fieldTraits[primaryRecommendation] || [];
  traits.push(...primaryTraits.slice(0, 3));
  
  // 보조 분야의 특성에서 2개 선택
  const secondaryTraits = fieldTraits[secondaryRecommendation] || [];
  traits.push(...secondaryTraits.slice(0, 2).filter(trait => !traits.includes(trait)));
  
  // 최종 결과 반환
  return {
    recommendedPath: primaryRecommendation,
    secondaryPath: secondaryRecommendation,
    scores: scores,
    details: pathDescriptions[primaryRecommendation],
    secondaryDetails: pathDescriptions[secondaryRecommendation],
    traits: traits,
    allPaths: pathDescriptions
  };
}

// Bedrock으로 고급 분석 수행
async function enhanceAnalysisWithBedrock(answers, initialResult) {
  const bedrockClient = new BedrockRuntimeClient({ 
    region: process.env.AWS_REGION || 'ap-northeast-2' 
  });
  
  const prompt = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1000,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "당신은 개발자 적성 테스트 결과를 분석하는 전문가입니다. 사용자의 답변과 기본 분석 결과를 바탕으로 더 깊이 있는 통찰력을 제공해주세요."
      },
      {
        role: "user",
        content: `사용자의 답변: ${JSON.stringify(answers)}\n\n기본 분석 결과: ${JSON.stringify(initialResult)}\n\n이 사용자의 답변 패턴을 분석하여 추가적인 통찰과 강점, 약점, 학습 제안을 제공해주세요. JSON 형식으로 insights, strengths, weaknesses, learningRecommendations 필드를 포함해주세요.`
      }
    ]
  };

  try {
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(prompt)
    });
    
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(Buffer.from(response.body).toString());
    const messageContent = responseBody.content[0].text;
    
    // JSON 추출
    const jsonMatch = messageContent.match(/```json\n([\s\S]*?)\n```/) || 
                      messageContent.match(/```\n([\s\S]*?)\n```/) ||
                      messageContent.match(/{[\s\S]*}/);
    
    if (jsonMatch) {
      const enhancedInsights = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return enhancedInsights;
    }
    
    return null;
  } catch (error) {
    console.error('Bedrock analysis error:', error);
    return null;
  }
}