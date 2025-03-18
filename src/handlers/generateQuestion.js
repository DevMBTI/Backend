// handlers/generateQuestion.js
const { aiGeneratedQuestions } = require('../utils/constants');
const { success, error, validateInput, logError } = require('../utils/middleware');
const { generateQuestionSchema } = require('../utils/validation');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
require('dotenv').config();

// Bedrock 클라이언트 설정
const bedrockClient = new BedrockRuntimeClient({ 
  region: process.env.AWS_REGION || 'ap-northeast-2' 
});

// Bedrock 사용 여부 체크
const USE_BEDROCK = process.env.USE_BEDROCK === 'true';

exports.handler = async (event) => {
  try {
    console.log('Generate Question - Request received:', event);
    
    // 요청 본문 파싱
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
      console.log('Request body parsed:', requestBody);
    } catch (e) {
      console.error('JSON parsing error:', e);
      return error(400, 'Invalid request body. JSON parsing failed.');
    }
    
    // 입력 유효성 검증
    const { valid, errors } = validateInput(generateQuestionSchema, requestBody);
    if (!valid) {
      console.error('Validation errors:', errors);
      return error(400, 'Validation failed', errors);
    }
    
    const { category, difficulty = 'medium' } = requestBody;
    console.log(`Processing request for category: ${category}, difficulty: ${difficulty}`);
    
    // 해당 카테고리의 미리 정의된 문제 가져오기 (폴백용)
    const fallbackQuestion = aiGeneratedQuestions[category] || aiGeneratedQuestions.frontend;
    
    // Bedrock 사용이 비활성화된 경우 바로 미리 정의된 문제 반환
    if (!USE_BEDROCK) {
      console.log('Bedrock is disabled. Using predefined questions.');
      return success(fallbackQuestion);
    }
    
    // 요청 횟수 제한을 위한 확률 계산 (50% 확률로 Bedrock 호출, 실제 환경에서는 100%로 설정)
    const shouldUseBedrock = Math.random() < 0.5;
    
    if (!shouldUseBedrock) {
      console.log('Skipping Bedrock call to limit requests. Using predefined questions.');
      return success(fallbackQuestion);
    }
    
    // Bedrock을 사용한 동적 질문 생성 시도
    try {
      console.log('Attempting to generate question with Bedrock');
      const question = await generateWithBedrock(category);
      console.log('Successfully generated question with Bedrock');
      return success(question);
    } catch (aiError) {
      console.error('Bedrock error details:', aiError);
      logError('Bedrock question generation', aiError);
      console.log('Falling back to predefined questions due to Bedrock error');
      return success(fallbackQuestion);
    }
  } catch (err) {
    console.error('Unhandled error in handler:', err);
    logError('generateQuestion handler', err);
    return error(500, 'Could not generate question', { message: err.message });
  }
};

// Amazon Bedrock을 사용한 동적 질문 생성 함수
async function generateWithBedrock(category) {
  console.log(`Generating with Bedrock for category: ${category}`);
  
  const categoryDescriptions = {
    frontend: "HTML, CSS, JavaScript, React, Vue.js에 관한 문제",
    backend: "Node.js, Express, Database, API 설계에 관한 문제",
    fullstack: "프론트엔드와 백엔드 기술 전반에 관한 문제",
    data: "데이터 분석, 머신러닝, 통계에 관한 문제",
    devops: "CI/CD, Docker, Kubernetes, 클라우드 인프라에 관한 문제",
    mobile: "Android, iOS, React Native, Flutter와 같은 모바일 앱 개발에 관한 문제",
    security: "보안 취약점, 암호화, 인증, 네트워크 보안에 관한 문제",
    gamedev: "Unity, Unreal Engine, 게임 로직, 그래픽스에 관한 문제",
    embedded: "마이크로컨트롤러, 하드웨어 인터페이스, RTOS, 펌웨어에 관한 문제",
    ai: "인공지능, 머신러닝, 딥러닝, 신경망, 자연어 처리에, 관한 문제"
  };

  const prompt = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1000,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: "당신은 개발자 적성 테스트를 위한 문제를 생성하는 AI입니다. 해당 카테고리에 맞는 기술적인 문제와 4개의 선택지, 그리고 정답 번호(0-3)와 정답 설명을 생성해주세요."
      },
      {
        role: "user",
        content: `${categoryDescriptions[category] || categoryDescriptions.frontend}를 생성해주세요. 
JSON 형식으로 다음 필드를 포함하세요:
- question: 질문 문자열
- options: 4개의 선택지 배열
- answer: 정답 인덱스 (0-3 사이의 숫자)
- explanation: 정답에 대한 설명

질문은 개발자가 해당 분야의 지식을 테스트할 수 있도록 기술적으로 정확해야 합니다.`
      }
    ]
  };

  console.log('Bedrock prompt prepared');
  
  // Bedrock 모델 ID 설정 (환경 변수에서 가져오거나 기본값 사용)
  const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";
  console.log(`Using Bedrock model: ${modelId}`);

  try {
    // Claude 모델 호출
    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(prompt)
    });

    console.log('Sending request to Bedrock');
    const response = await bedrockClient.send(command);
    console.log('Received response from Bedrock');
    
    const responseBody = JSON.parse(Buffer.from(response.body).toString());
    
    // Claude 응답에서 JSON 파싱
    const messageContent = responseBody.content[0].text;
    console.log('Bedrock response content:', messageContent.substring(0, 200) + '...');
    
    // JSON 형식의 문자열 추출 (마크다운 코드 블록에서)
    const jsonMatch = messageContent.match(/```json\n([\s\S]*?)\n```/) || 
                      messageContent.match(/```\n([\s\S]*?)\n```/) ||
                      messageContent.match(/{[\s\S]*}/);
    
    if (!jsonMatch) {
      console.error('Could not extract JSON from Bedrock response');
      throw new Error('Could not extract JSON from Bedrock response');
    }
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      console.log('Successfully parsed JSON from Bedrock response');
    } catch (e) {
      console.error('JSON parsing error:', e);
      throw new Error('Invalid JSON in Bedrock response');
    }

    // 기본 구조 확인 및 유효성 검증
    if (!parsedContent.question || !Array.isArray(parsedContent.options) || 
        parsedContent.options.length !== 4 || typeof parsedContent.answer !== 'number' ||
        parsedContent.answer < 0 || parsedContent.answer > 3) {
      console.error('Invalid question format:', parsedContent);
      throw new Error('Invalid question format from Bedrock');
    }
    
    // explanation 필드가 없는 경우 기본값 추가
    if (!parsedContent.explanation) {
      parsedContent.explanation = "AI가 생성한 문제입니다.";
    }
    
    return parsedContent;
  } catch (error) {
    console.error('Error in Bedrock generation:', error);
    throw error;
  }
}