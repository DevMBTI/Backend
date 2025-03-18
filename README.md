# DevMBTI 백엔드

개발자 적성 테스트를 위한 서버리스 백엔드 API

## 주요 기능

- 답변 분석 및 개발자 적성 결과 제공
- 질문 생성 API (기본 질문 또는 OpenAI 기반 동적 생성)
- 결과 저장 및 조회
- 결과 통계 분석

## 설치 및 실행

### 필수 조건

- Node.js 16 이상
- AWS CLI 구성 및 자격 증명 설정
- Serverless Framework

### 로컬 개발 환경 설정

1. 의존성 설치

```bash
npm install
```

2. 환경 변수 설정
   `.env.example`을 복사하여 `.env` 파일 생성

```bash
cp .env.example .env
```

필요한 환경 변수 설정

3. 로컬에서 실행

```bash
npm run offline
```

### 배포

1. 개발 환경 배포

```bash
npm run deploy
```

2. 프로덕션 환경 배포

```bash
npm run deploy:prod
```

## API 엔드포인트

### POST /api/analyze

답변을 제출하고 분석 결과를 받습니다.

**요청 본문:**

```json
{
  "userName": "사용자명 (선택사항)",
  "answers": {
    "q1": 0,
    "q2": 1,
    "q3": 2,
    ...
  }
}
```

**응답:**

```json
{
  "id": "결과 ID",
  "result": {
    "recommendedPath": "추천 경로",
    "secondaryPath": "보조 추천 경로",
    "scores": {
      "frontend": 85,
      "backend": 65,
      ...
    },
    "details": {
      "title": "제목",
      "subtitle": "부제목",
      "description": "설명",
      ...
    },
    "secondaryDetails": { ... },
    "traits": ["특성1", "특성2", ...],
    "allPaths": { ... }
  }
}
```

### POST /api/question

카테고리에 맞는 질문을 생성합니다.

**요청 본문:**

```json
{
  "category": "frontend|backend|fullstack|data|devops"
}
```

**응답:**

```json
{
  "question": "질문 텍스트",
  "options": ["답변1", "답변2", "답변3", "답변4"],
  "answer": 0
}
```

### GET /api/results/{id}

특정 ID의 결과를 조회합니다.

**응답:**

```json
{
  "id": "결과 ID",
  "userName": "사용자명",
  "result": { ... },
  "createdAt": "생성 시간"
}
```

### GET /api/stats

테스트 결과 통계를 조회합니다.

**쿼리 파라미터:**

- `days`: 통계 기간 (일, 기본값: 7)

**응답:**

```json
{
  "count": 통계 기간 내 결과 수,
  "totalCount": 전체 결과 수,
  "pathDistribution": {
    "frontend": 30,
    "backend": 25,
    ...
  },
  "timeDistribution": {
    "2023-06-01": 10,
    "2023-06-02": 15,
    ...
  },
  "averageScores": {
    "frontend": 75,
    "backend": 68,
    ...
  },
  "recentResults": [
    {
      "id": "결과 ID",
      "userName": "사용자명",
      "recommendedPath": "추천 경로",
      "createdAt": "생성 시간"
    },
    ...
  ],
  "periodDays": 7
}
```

## 라이센스

MIT
