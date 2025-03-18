#!/bin/bash

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
  echo "의존성 설치 중..."
  npm install
fi

# 환경 변수 파일 확인
if [ ! -f ".env" ]; then
  echo ".env 파일 생성 중..."
  cp .env.example .env
  echo ".env 파일이 생성되었습니다. 필요한 환경 변수를 설정하세요."
fi

# 로컬 서버 실행
echo "서버리스 오프라인 모드 실행 중..."
npm run offline 